import type { SupabaseClient } from "@supabase/supabase-js";

import { getAnalyticsKpis, type BranchKpiRow } from "@/lib/gm-hr/analytics-service";

import type { ExportBundle, ExportCommunicationRow, ExportFruhstuckRow, ExportReportRow } from "./types";

function summarizeReportData(data: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(data)) {
    if (v === null || v === undefined || v === "") continue;
    parts.push(`${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`);
  }
  return parts.slice(0, 6).join(" | ") || "—";
}

export async function fetchExportBundle(
  supabase: SupabaseClient,
  opts: {
    start_date: string;
    end_date: string;
    branch_ids: string[];
    hr_only: boolean;
    generated_by: string;
    include_communication?: boolean;
  },
): Promise<ExportBundle> {
  const { start_date, end_date, branch_ids, hr_only, generated_by, include_communication } = opts;

  const branchFilter = branch_ids.length === 1 ? branch_ids[0]! : null;
  const kpiData = await getAnalyticsKpis(supabase, {
    period: "custom",
    start: start_date,
    end: end_date,
    branchId: branchFilter ?? "all",
    hrOnly: hr_only,
  });

  let by_branch = kpiData.by_branch;
  if (branch_ids.length > 1) {
    const set = new Set(branch_ids);
    by_branch = by_branch.filter((b) => set.has(b.branch_id));
  }

  let repQ = supabase
    .from("reports")
    .select(
      "id, branch_id, template_id, status, submitted_at, submitted_by, data, request_id, branches(name), templates(title, type), report_requests(period_start, period_end)",
    )
    .in("status", ["submitted", "reviewed"])
    .gte("submitted_at", `${start_date}T00:00:00.000Z`)
    .lte("submitted_at", `${end_date}T23:59:59.999Z`);

  if (branch_ids.length > 0) repQ = repQ.in("branch_id", branch_ids);

  const { data: reportRows } = await repQ.order("submitted_at", { ascending: false });

  let reportsList = reportRows ?? [];
  if (hr_only) {
    const { data: tpls } = await supabase.from("templates").select("id").eq("type", "hr");
    const hrIds = new Set((tpls ?? []).map((t) => t.id));
    reportsList = reportsList.filter((r) => hrIds.has(r.template_id as string));
  }

  const submitterIds = [...new Set(reportsList.map((r) => r.submitted_by).filter(Boolean))] as string[];
  const { data: submitters } =
    submitterIds.length > 0
      ? await supabase.from("users").select("id, full_name, email").in("id", submitterIds)
      : { data: [] };
  const submitterMap = new Map(
    (submitters ?? []).map((u) => [u.id, (u.full_name && String(u.full_name).trim()) || u.email]),
  );

  const reports: ExportReportRow[] = reportsList.map((r) => {
    const branch = r.branches as { name?: string } | { name?: string }[] | null;
    const tpl = r.templates as { title?: string; type?: string } | null;
    const req = r.report_requests as { period_start?: string; period_end?: string } | null;
    const bname = Array.isArray(branch) ? branch[0]?.name : branch?.name;
    return {
      id: r.id as string,
      branch_id: r.branch_id as string,
      branch_name: bname ?? "Branch",
      template_title: tpl?.title ?? "Report",
      template_type: tpl?.type ?? "—",
      period_start: req?.period_start ?? start_date,
      period_end: req?.period_end ?? end_date,
      status: r.status as string,
      submitted_by_name: r.submitted_by ? (submitterMap.get(r.submitted_by as string) ?? null) : null,
      submitted_at: r.submitted_at as string | null,
      data_summary: summarizeReportData((r.data as Record<string, unknown>) ?? {}),
    };
  });

  let fruhstuck: ExportFruhstuckRow[] = [];
  if (!hr_only) {
    let fQ = supabase
      .from("fruhstuck_data")
      .select("date, orders_count, revenue, top_item, branches(name)")
      .gte("date", start_date)
      .lte("date", end_date);
    if (branch_ids.length > 0) fQ = fQ.in("branch_id", branch_ids);
    const { data: fRows } = await fQ.order("date", { ascending: false });
    fruhstuck = (fRows ?? []).map((row) => {
      const branch = row.branches as { name?: string } | { name?: string }[] | null;
      const bname = Array.isArray(branch) ? branch[0]?.name : branch?.name;
      return {
        branch_name: bname ?? "Branch",
        date: String(row.date),
        orders_count: Number(row.orders_count),
        revenue: Number(row.revenue),
        top_item: row.top_item as string | null,
      };
    });
  }

  let communication: ExportCommunicationRow[] = [];
  if (include_communication) {
    const { data: msgs } = await supabase
      .from("hub_messages")
      .select("body, created_at, user_id, channel_id")
      .gte("created_at", `${start_date}T00:00:00.000Z`)
      .lte("created_at", `${end_date}T23:59:59.999Z`)
      .order("created_at", { ascending: false })
      .limit(200);

    const channelIds = [...new Set((msgs ?? []).map((m) => m.channel_id))];
    const userIds = [...new Set((msgs ?? []).map((m) => m.user_id))];
    const [{ data: channels }, { data: users }] = await Promise.all([
      channelIds.length ? supabase.from("hub_channels").select("id, name").in("id", channelIds) : { data: [] },
      userIds.length ? supabase.from("users").select("id, full_name, email, role").in("id", userIds) : { data: [] },
    ]);
    const chMap = new Map((channels ?? []).map((c) => [c.id, c.name]));
    const uMap = new Map(
      (users ?? []).map((u) => [
        u.id,
        { name: (u.full_name && String(u.full_name).trim()) || u.email, role: u.role },
      ]),
    );

    communication = (msgs ?? []).map((m) => {
      const u = uMap.get(m.user_id as string);
      return {
        created_at: m.created_at as string,
        author_name: u?.name ?? "User",
        role: u?.role ?? "—",
        channel_name: chMap.get(m.channel_id as string) ?? "Channel",
        body: String(m.body),
      };
    });
  }

  return {
    start_date,
    end_date,
    branch_ids,
    hr_only,
    generated_by,
    summary: kpiData.summary,
    by_branch,
    reports,
    fruhstuck,
    communication,
  };
}

export function defaultBranchIds(allBranches: { id: string }[]): string[] {
  return allBranches.map((b) => b.id);
}

export function lastWeekRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function lastFourWeeksRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - 27);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function formatDateRangeLabel(start: string, end: string) {
  const fmt = (d: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d));
  return `${fmt(start)} — ${fmt(end)}`;
}

export function branchInsightLine(branch: BranchKpiRow): string {
  return `${branch.branch_name}: €${branch.total_revenue} revenue, ${branch.avg_occupancy}% occupancy, ${branch.total_negative_feedback} negative feedback, ${branch.reports_submitted} reports.`;
}
