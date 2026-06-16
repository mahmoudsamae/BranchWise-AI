import type { SupabaseClient } from "@supabase/supabase-js";

import { todayWorkDate } from "@/lib/branch-ops/dates";
import { fetchBranchHealthScores } from "@/lib/gm-hr/health-score";
import { HR_FIELD_IDS } from "@/lib/hr/default-template";
import { getBerlinMonthRange } from "@/lib/branch/overtime-summary";
import { aggregateStaffMetrics, filterReportRowsByPeriod } from "@/lib/staff/aggregate-metrics";
import { fetchBranchReportEntries } from "@/lib/staff/fetch-branch-entries";
import { roundStaffHours } from "@/lib/staff/format-hours";
import { formatPeriodLabel } from "@/lib/staff/period";

export type AreaStatus = "green" | "yellow" | "red" | "gray";

export type BranchStatusRow = {
  branch_id: string;
  branch_name: string;
  camp_score: number | null;
  score_segments: AreaStatus[];
  areas: {
    rezeption: AreaStatus;
    sanitaer: AreaStatus;
    gruenpflege: AreaStatus;
    bestellungen: AreaStatus;
    personal: AreaStatus;
    projekte: AreaStatus;
  };
  last_report_label: string;
  last_report_overdue: boolean;
};

export type OperationsProject = {
  id: string;
  branch_id: string;
  branch_name: string;
  title: string;
  status: "blocked" | "waiting" | "running";
  status_label: string;
  notes: string | null;
  progress: number;
};

export type RequestQueueItem = {
  id: string;
  kind: "support" | "report";
  branch_id: string;
  branch_name: string;
  title: string;
  source: string;
};

export type MissingReportItem = {
  request_id: string;
  branch_id: string;
  branch_name: string;
  report_title: string;
  period_label: string;
  due_date: string;
  days_overdue: number;
};

export type SupportPreviewItem = {
  id: string;
  branch_name: string;
  title: string;
};

export type OperationsDashboardData = {
  live: true;
  header: {
    date_label: string;
    region_label: string;
    branch_count: number;
  };
  decisions: {
    missing_reports: {
      count: number;
      items: MissingReportItem[];
      all_clear: boolean;
    };
    support_requests: {
      count: number;
      items: SupportPreviewItem[];
      all_clear: boolean;
    };
  };
  branch_status: BranchStatusRow[];
  projects: OperationsProject[];
  request_queue: RequestQueueItem[];
};

const OVERTIME_WARN_HOURS = 10;
const OVERTIME_CRITICAL_HOURS = 15;
const GRAY: AreaStatus = "gray";

function berlinHeaderDate(): string {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
}

function segmentColor(pts: number, max: number): AreaStatus {
  const ratio = max > 0 ? pts / max : 0;
  if (ratio >= 0.75) return "green";
  if (ratio >= 0.45) return "yellow";
  return "red";
}

function dotFromRatio(ratio: number | null): AreaStatus {
  if (ratio == null) return GRAY;
  if (ratio >= 0.85) return "green";
  if (ratio >= 0.55) return "yellow";
  return "red";
}

function dotFromCount(count: number | null | undefined, warnAt: number, criticalAt: number): AreaStatus {
  if (count == null) return GRAY;
  if (count >= criticalAt) return "red";
  if (count >= warnAt) return "yellow";
  return "green";
}

function shortReportTitle(title: string): string {
  const t = title.trim();
  const replacements: [RegExp, string][] = [
    [/^daily branch report$/i, "Tagesbericht"],
    [/^daily operations$/i, "Tages-Ops"],
    [/^weekly operations$/i, "Wochenbericht"],
    [/^gastbewertungsbericht$/i, "Gastbewertungen"],
  ];
  for (const [re, label] of replacements) {
    if (re.test(t)) return label;
  }
  return t.length > 36 ? `${t.slice(0, 33)}…` : t;
}

function formatDueDate(ymd: string): string {
  try {
    return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" }).format(new Date(`${ymd}T12:00:00`));
  } catch {
    return ymd;
  }
}

function shortBranchName(name: string): string {
  return name.replace(/^AZUR Camping\s*/i, "").trim() || name;
}

function formatLastReport(iso: string | null, overdue: boolean, daysOverdue: number | null): string {
  if (overdue && daysOverdue != null) return `– ${daysOverdue} Tage`;
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function extractSupportText(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  const keys = [HR_FIELD_IDS.supportNeeded, "support_needed_hq", "support_needed", "f7"];
  for (const k of keys) {
    const t = String(obj[k] ?? "").trim();
    if (t) return t.length > 140 ? `${t.slice(0, 137)}…` : t;
  }
  for (const [key, value] of Object.entries(obj)) {
    if (!key.toLowerCase().includes("support")) continue;
    const t = String(value ?? "").trim();
    if (t) return t.length > 140 ? `${t.slice(0, 137)}…` : t;
  }
  return null;
}

function projectStatus(
  currentStage: number,
  stages: string[],
  status: string,
): { status: OperationsProject["status"]; label: string; progress: number } {
  if (status === "done") return { status: "running", label: "FERTIG", progress: 100 };
  const total = Math.max(stages.length, 1);
  const progress = Math.round((currentStage / Math.max(total - 1, 1)) * 100);
  const stageName = (stages[currentStage] ?? "").toLowerCase();

  if (stageName.includes("entscheidung") || stageName.includes("kalkulation")) {
    return { status: "blocked", label: "BLOCKIERT", progress: Math.max(progress, 20) };
  }
  if (stageName.includes("anfrage") || stageName.includes("telefonat") || stageName.includes("wartet")) {
    return { status: "waiting", label: "WARTET", progress: Math.max(progress, 35) };
  }
  if (progress >= 75) return { status: "running", label: "LÄUFT", progress };
  if (progress >= 35) return { status: "waiting", label: "WARTET", progress };
  return { status: "blocked", label: "BLOCKIERT", progress: Math.max(progress, 15) };
}

function deriveRegionLabel(locations: (string | null)[]): string {
  const cleaned = locations.map((l) => l?.trim()).filter(Boolean) as string[];
  if (!cleaned.length) return "Alle Standorte";
  const unique = [...new Set(cleaned)];
  if (unique.length === 1) return unique[0]!;
  return "Alle Standorte";
}

function overtimeAreaStatus(teamOvertime: number, staffNearLimit: number): AreaStatus {
  if (teamOvertime === 0 && staffNearLimit === 0) return GRAY;
  if (staffNearLimit >= 2 || teamOvertime >= OVERTIME_CRITICAL_HOURS) return "red";
  if (staffNearLimit >= 1 || teamOvertime >= OVERTIME_WARN_HOURS) return "yellow";
  return "green";
}

async function fetchOpsCompletionByBranch(
  supabase: SupabaseClient,
  branchIds: string[],
): Promise<Map<string, Map<string, { completed: number; total: number }>>> {
  const result = new Map<string, Map<string, { completed: number; total: number }>>();
  if (!branchIds.length) return result;

  const workDate = todayWorkDate();
  const { data: tables } = await supabase
    .from("branch_ops_tables")
    .select("id, branch_id, name")
    .in("branch_id", branchIds)
    .eq("table_type", "daily")
    .eq("is_active", true);

  const tableIds = (tables ?? []).map((t) => t.id as string);
  if (!tableIds.length) return result;

  const { data: items } = await supabase
    .from("branch_ops_daily_items")
    .select("id, table_id")
    .in("table_id", tableIds)
    .eq("is_active", true);

  const itemsByTable = new Map<string, string[]>();
  for (const item of items ?? []) {
    const tid = item.table_id as string;
    const list = itemsByTable.get(tid) ?? [];
    list.push(item.id as string);
    itemsByTable.set(tid, list);
  }

  const allItemIds = (items ?? []).map((i) => i.id as string);
  const completedByItem = new Map<string, number>();
  if (allItemIds.length) {
    const { data: completions } = await supabase
      .from("branch_ops_daily_completions")
      .select("daily_item_id")
      .in("daily_item_id", allItemIds)
      .eq("work_date", workDate);
    for (const c of completions ?? []) {
      const id = c.daily_item_id as string;
      completedByItem.set(id, (completedByItem.get(id) ?? 0) + 1);
    }
  }

  for (const table of tables ?? []) {
    const bid = table.branch_id as string;
    const name = String(table.name).toLowerCase();
    const itemIds = itemsByTable.get(table.id as string) ?? [];
    const total = itemIds.length;
    const completed = itemIds.filter((id) => (completedByItem.get(id) ?? 0) > 0).length;
    const branchMap = result.get(bid) ?? new Map();
    branchMap.set(name, { completed, total });
    result.set(bid, branchMap);
  }

  return result;
}

function opsAreaStatus(
  opsMap: Map<string, { completed: number; total: number }> | undefined,
  keywords: string[],
): AreaStatus {
  if (!opsMap || opsMap.size === 0) return GRAY;
  for (const [name, stats] of opsMap) {
    if (keywords.some((k) => name.includes(k))) {
      if (stats.total === 0) return GRAY;
      return dotFromRatio(stats.completed / stats.total);
    }
  }
  return GRAY;
}

export async function fetchOperationsDashboard(supabase: SupabaseClient): Promise<OperationsDashboardData> {
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: branches },
    healthScores,
    { data: pendingReqs },
    { data: allIssues },
    { data: recentKpis },
    { data: submittedReports },
  ] = await Promise.all([
    supabase.from("branches").select("id, name, location").eq("is_active", true).order("name"),
    fetchBranchHealthScores(supabase),
    supabase
      .from("report_requests")
      .select("id, branch_id, title, due_date, period_start, period_end, status")
      .eq("status", "pending"),
    supabase
      .from("branch_issues")
      .select("id, branch_id, kind, title, stages, current_stage, status, notes, updated_at")
      .eq("status", "open")
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("kpis")
      .select("branch_id, support_needed, repeated_issues, negative_feedback, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("reports")
      .select("id, branch_id, submitted_at, data")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(500),
  ]);

  const branchList = branches ?? [];
  const branchIds = branchList.map((b) => b.id as string);
  const branchName = new Map(branchList.map((b) => [b.id as string, String(b.name)]));

  const overdueReqs = (pendingReqs ?? []).filter((r) => String(r.due_date) < today);
  const missingItems: MissingReportItem[] = overdueReqs
    .map((r) => {
      const bid = r.branch_id as string;
      const days = Math.max(1, Math.floor((Date.parse(today) - Date.parse(String(r.due_date))) / 86400000));
      const periodStart = String(r.period_start ?? "");
      const periodEnd = String(r.period_end ?? periodStart);
      return {
        request_id: r.id as string,
        branch_id: bid,
        branch_name: shortBranchName(branchName.get(bid) ?? "Filiale"),
        report_title: shortReportTitle(String(r.title ?? "Bericht")),
        period_label: formatPeriodLabel(periodStart, periodEnd),
        due_date: String(r.due_date),
        days_overdue: days,
      };
    })
    .sort((a, b) => b.days_overdue - a.days_overdue);

  const latestKpiByBranch = new Map<
    string,
    { support_needed: number; repeated_issues: number; negative_feedback: number }
  >();
  for (const k of recentKpis ?? []) {
    const bid = k.branch_id as string;
    if (!latestKpiByBranch.has(bid)) {
      latestKpiByBranch.set(bid, {
        support_needed: Number(k.support_needed ?? 0),
        repeated_issues: Number(k.repeated_issues ?? 0),
        negative_feedback: Number(k.negative_feedback ?? 0),
      });
    }
  }

  const latestReportByBranch = new Map<string, { submitted_at: string; data: unknown }>();
  for (const r of submittedReports ?? []) {
    const bid = r.branch_id as string;
    if (!latestReportByBranch.has(bid) && r.submitted_at) {
      latestReportByBranch.set(bid, { submitted_at: r.submitted_at, data: r.data });
    }
  }

  const month = getBerlinMonthRange();
  const overtimeByBranchMap = new Map<string, { teamOvertime: number; staffNearLimit: number }>();
  for (const bid of branchIds) overtimeByBranchMap.set(bid, { teamOvertime: 0, staffNearLimit: 0 });

  await Promise.all(
    branchIds.map(async (bid) => {
      const entries = await fetchBranchReportEntries(supabase, bid);
      const monthRows = filterReportRowsByPeriod(entries, month.start, month.end);
      const metrics = aggregateStaffMetrics(monthRows);
      let teamOvertime = 0;
      let staffNearLimit = 0;
      for (const m of metrics.values()) {
        teamOvertime += m.total_overtime;
        if (m.total_overtime >= OVERTIME_WARN_HOURS) staffNearLimit++;
      }
      overtimeByBranchMap.set(bid, {
        teamOvertime: roundStaffHours(teamOvertime),
        staffNearLimit,
      });
    }),
  );

  const opsByBranch = await fetchOpsCompletionByBranch(supabase, branchIds);
  const healthByBranch = new Map(healthScores.map((h) => [h.branch_id, h]));

  const issuesByBranch = new Map<string, NonNullable<typeof allIssues>>();
  for (const issue of allIssues ?? []) {
    const bid = issue.branch_id as string;
    const list = issuesByBranch.get(bid) ?? [];
    list.push(issue);
    issuesByBranch.set(bid, list);
  }

  const overdueByBranch = new Map(overdueReqs.map((r) => [r.branch_id as string, r]));

  const branch_status: BranchStatusRow[] = branchList.map((b) => {
    const bid = b.id as string;
    const health = healthByBranch.get(bid);
    const kpi = latestKpiByBranch.get(bid);
    const ops = opsByBranch.get(bid);
    const ot = overtimeByBranchMap.get(bid);
    const branchIssues = issuesByBranch.get(bid) ?? [];
    const openProjects = branchIssues.filter((i) => i.kind === "project");
    const overdue = overdueByBranch.get(bid);
    const lastReport = latestReportByBranch.get(bid);

    let projekteStatus: AreaStatus = GRAY;
    if (openProjects.length > 0) {
      const hasBlocked = openProjects.some((p) => {
        const stages = Array.isArray(p.stages) ? p.stages.map(String) : [];
        return projectStatus(p.current_stage, stages, p.status).status === "blocked";
      });
      const hasWaiting = openProjects.some((p) => {
        const stages = Array.isArray(p.stages) ? p.stages.map(String) : [];
        return projectStatus(p.current_stage, stages, p.status).status === "waiting";
      });
      projekteStatus = hasBlocked ? "red" : hasWaiting ? "yellow" : "green";
    }

    const breakdown = health?.breakdown;
    const score_segments: AreaStatus[] = breakdown
      ? [
          segmentColor(breakdown.feedback, 25),
          segmentColor(breakdown.submission_rate, 25),
          segmentColor(breakdown.occupancy, 25),
          segmentColor(breakdown.revenue_trend, 25),
        ]
      : [GRAY, GRAY, GRAY, GRAY];

    const daysOverdue = overdue
      ? Math.max(1, Math.floor((Date.parse(today) - Date.parse(String(overdue.due_date))) / 86400000))
      : null;

    return {
      branch_id: bid,
      branch_name: shortBranchName(String(b.name)),
      camp_score: health ? health.score : null,
      score_segments,
      areas: {
        rezeption: opsAreaStatus(ops, ["rezeption", "reception", "empfang"]),
        sanitaer: kpi ? dotFromCount(kpi.repeated_issues, 1, 3) : GRAY,
        gruenpflege: opsAreaStatus(ops, ["grün", "gruen", "grounds", "pflege"]),
        bestellungen: kpi ? dotFromCount(kpi.support_needed, 1, 2) : GRAY,
        personal: overtimeAreaStatus(ot?.teamOvertime ?? 0, ot?.staffNearLimit ?? 0),
        projekte: projekteStatus,
      },
      last_report_label: formatLastReport(
        lastReport?.submitted_at ?? null,
        Boolean(overdue),
        daysOverdue,
      ),
      last_report_overdue: Boolean(overdue),
    };
  });

  branch_status.sort((a, b) => (a.camp_score ?? 0) - (b.camp_score ?? 0));

  const projects: OperationsProject[] = (allIssues ?? [])
    .filter((i) => i.kind === "project")
    .map((i) => {
      const stages = Array.isArray(i.stages) ? i.stages.map(String) : [];
      const ps = projectStatus(i.current_stage, stages, i.status);
      return {
        id: i.id as string,
        branch_id: i.branch_id as string,
        branch_name: shortBranchName(branchName.get(i.branch_id as string) ?? "Filiale"),
        title: String(i.title),
        status: ps.status,
        status_label: ps.label,
        notes: i.notes as string | null,
        progress: ps.progress,
      };
    });

  const request_queue: RequestQueueItem[] = [];

  for (const issue of (allIssues ?? []).filter((i) => i.kind === "problem")) {
    request_queue.push({
      id: `issue-${issue.id}`,
      kind: "support",
      branch_id: issue.branch_id as string,
      branch_name: shortBranchName(branchName.get(issue.branch_id as string) ?? "Filiale"),
      title: String(issue.title),
      source: "branch_issues",
    });
  }

  for (const [bid, report] of latestReportByBranch) {
    const supportText = extractSupportText(report.data);
    if (!supportText) continue;
    request_queue.push({
      id: `report-support-${bid}`,
      kind: "support",
      branch_id: bid,
      branch_name: shortBranchName(branchName.get(bid) ?? "Filiale"),
      title: supportText,
      source: "report",
    });
  }

  const supportCount = request_queue.filter((q) => q.kind === "support").length;
  const supportPreview: SupportPreviewItem[] = request_queue
    .filter((q) => q.kind === "support")
    .slice(0, 5)
    .map((q) => ({ id: q.id, branch_name: q.branch_name, title: q.title }));

  return {
    live: true,
    header: {
      date_label: berlinHeaderDate(),
      region_label: deriveRegionLabel(branchList.map((b) => b.location)),
      branch_count: branchList.length,
    },
    decisions: {
      missing_reports: {
        count: overdueReqs.length,
        items: missingItems,
        all_clear: missingItems.length === 0,
      },
      support_requests: {
        count: supportCount,
        items: supportPreview,
        all_clear: supportCount === 0,
      },
    },
    branch_status,
    projects,
    request_queue: request_queue.slice(0, 12),
  };
}
