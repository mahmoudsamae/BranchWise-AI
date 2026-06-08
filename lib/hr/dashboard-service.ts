import type { SupabaseClient } from "@supabase/supabase-js";

import { HR_FIELD_IDS } from "@/lib/hr/default-template";
import { getScopedRequestIds, getTemplateIdsForRole } from "@/lib/hr/requester-filter";
import { entryInPeriod } from "@/lib/staff/period";

function weekAgoIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString().slice(0, 10);
}

function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

function periodLabel(start: string | null, end: string | null) {
  if (!start && !end) return "—";
  if (start === end || !end) return start ?? "—";
  return `${start} – ${end}`;
}

function moraleFromData(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  const m = String(data[HR_FIELD_IDS.teamMorale] ?? "").trim();
  return m || null;
}

export type HrDashboardPayload = {
  kpis: {
    open_requests: number;
    submitted_this_week: number;
    overtime_hours_week: number;
    staff_registered: number;
  };
  alerts: {
    high_overtime: { branch_id: string; branch_name: string; overtime_hours: number }[];
    poor_morale: { branch_id: string; branch_name: string }[];
    missing_report: { branch_id: string; branch_name: string }[];
  };
  active_requests: {
    request_id: string;
    report_id: string | null;
    branch_id: string;
    branch_name: string;
    period: string;
    due_date: string;
    status: string;
    submitted_by_name: string | null;
  }[];
  recent_reports: {
    report_id: string;
    branch_id: string;
    branch_name: string;
    week: string;
    submitted_at: string;
    overtime_hours: number;
    absences: number;
    morale: string | null;
  }[];
};

export async function fetchHrDashboard(supabase: SupabaseClient): Promise<HrDashboardPayload> {
  const today = todayYmd();
  const weekStart = weekAgoIso();
  const scopedRequestIds = await getScopedRequestIds(supabase, "hr");
  const hrTemplateIds = await getTemplateIdsForRole(supabase, "hr");

  const { data: branches } = await supabase.from("branches").select("id, name").eq("is_active", true).order("name");
  const branchName = new Map((branches ?? []).map((b) => [b.id, b.name]));

  const { count: staffCount } = await supabase
    .from("staff_members")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  let pendingReqs: { id: string; branch_id: string; due_date: string; period_start: string; period_end: string; status: string }[] = [];
  if (scopedRequestIds.length > 0) {
    const { data } = await supabase
      .from("report_requests")
      .select("id, branch_id, due_date, period_start, period_end, status")
      .eq("status", "pending")
      .in("id", scopedRequestIds);
    pendingReqs = (data ?? []) as typeof pendingReqs;
  }

  const open_requests = pendingReqs.length;

  let submitted_this_week = 0;
  if (hrTemplateIds.length > 0) {
    const weekAgoTs = new Date();
    weekAgoTs.setUTCDate(weekAgoTs.getUTCDate() - 7);
    const { count } = await supabase
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted")
      .in("template_id", hrTemplateIds)
      .gte("submitted_at", weekAgoTs.toISOString());
    submitted_this_week = count ?? 0;
  }

  const { data: staffEntries } = await supabase
    .from("staff_report_entries")
    .select("branch_id, overtime_hours, absences, week_start, period_end")
    .gte("week_start", weekStart)
    .lte("week_start", today);

  let overtime_hours_week = 0;
  const overtimeByBranch = new Map<string, number>();
  for (const e of (staffEntries ?? []).filter((row) =>
    entryInPeriod(String(row.week_start), row.period_end as string | null, weekStart, today),
  )) {
    const ot = Number(e.overtime_hours ?? 0);
    overtime_hours_week += ot;
    const bid = e.branch_id as string;
    overtimeByBranch.set(bid, (overtimeByBranch.get(bid) ?? 0) + ot);
  }

  const high_overtime = [...overtimeByBranch.entries()]
    .filter(([, h]) => h > 15)
    .map(([branch_id, overtime_hours]) => ({
      branch_id,
      branch_name: branchName.get(branch_id) ?? "Branch",
      overtime_hours: Math.round(overtime_hours * 10) / 10,
    }))
    .sort((a, b) => b.overtime_hours - a.overtime_hours);

  const { data: recentHrReports } =
    hrTemplateIds.length > 0
      ? await supabase
          .from("reports")
          .select("id, branch_id, data, submitted_at, request_id")
          .eq("status", "submitted")
          .in("template_id", hrTemplateIds)
          .order("submitted_at", { ascending: false })
          .limit(30)
      : { data: [] };

  const poor_morale: HrDashboardPayload["alerts"]["poor_morale"] = [];
  const seenPoor = new Set<string>();
  for (const r of recentHrReports ?? []) {
    const m = moraleFromData(r.data as Record<string, unknown>);
    if (m?.toLowerCase() === "poor" && !seenPoor.has(r.branch_id as string)) {
      seenPoor.add(r.branch_id as string);
      poor_morale.push({
        branch_id: r.branch_id as string,
        branch_name: branchName.get(r.branch_id as string) ?? "Branch",
      });
    }
  }

  const branchesWithReportThisWeek = new Set(
    (recentHrReports ?? [])
      .filter((r) => r.submitted_at && String(r.submitted_at).slice(0, 10) >= weekStart)
      .map((r) => r.branch_id as string),
  );
  const missing_report = (branches ?? [])
    .filter((b) => !branchesWithReportThisWeek.has(b.id))
    .map((b) => ({ branch_id: b.id, branch_name: b.name }));

  const requestIds = pendingReqs.map((r) => r.id);
  const { data: draftReports } =
    requestIds.length > 0
      ? await supabase.from("reports").select("id, request_id, branch_id, submitted_by").in("request_id", requestIds)
      : { data: [] };
  const reportByRequest = new Map((draftReports ?? []).map((r) => [`${r.request_id}|${r.branch_id}`, r]));

  const submitterIds = [...new Set((draftReports ?? []).map((r) => r.submitted_by).filter(Boolean))] as string[];
  const { data: users } =
    submitterIds.length > 0
      ? await supabase.from("users").select("id, full_name, email").in("id", submitterIds)
      : { data: [] };
  const userName = new Map((users ?? []).map((u) => [u.id, (u.full_name as string) || (u.email as string) || "Manager"]));

  const active_requests = pendingReqs.map((r) => {
    const rep = reportByRequest.get(`${r.id}|${r.branch_id}`);
    return {
      request_id: r.id,
      report_id: (rep?.id as string) ?? null,
      branch_id: r.branch_id,
      branch_name: branchName.get(r.branch_id) ?? "—",
      period: periodLabel(r.period_start, r.period_end),
      due_date: String(r.due_date),
      status: r.status,
      submitted_by_name: rep?.submitted_by ? userName.get(rep.submitted_by as string) ?? null : null,
    };
  });

  const reportIds = (recentHrReports ?? []).slice(0, 15).map((r) => r.id);
  const { data: entrySums } =
    reportIds.length > 0
      ? await supabase
          .from("staff_report_entries")
          .select("report_id, overtime_hours, absences")
          .in("report_id", reportIds)
      : { data: [] };

  const sumByReport = new Map<string, { ot: number; abs: number }>();
  for (const e of entrySums ?? []) {
    const rid = e.report_id as string;
    const cur = sumByReport.get(rid) ?? { ot: 0, abs: 0 };
    cur.ot += Number(e.overtime_hours ?? 0);
    cur.abs += Number(e.absences ?? 0);
    sumByReport.set(rid, cur);
  }

  const reqIds = [...new Set((recentHrReports ?? []).map((r) => r.request_id).filter(Boolean))] as string[];
  const { data: reqPeriods } =
    reqIds.length > 0
      ? await supabase.from("report_requests").select("id, period_start, period_end").in("id", reqIds)
      : { data: [] };
  const periodByReq = new Map(
    (reqPeriods ?? []).map((r) => [r.id, periodLabel(r.period_start as string, r.period_end as string)]),
  );

  const recent_reports = (recentHrReports ?? []).slice(0, 15).map((r) => {
    const sums = sumByReport.get(r.id as string);
    const data = r.data as Record<string, unknown>;
    return {
      report_id: r.id as string,
      branch_id: r.branch_id as string,
      branch_name: branchName.get(r.branch_id as string) ?? "—",
      week: periodByReq.get(r.request_id as string) ?? "—",
      submitted_at: r.submitted_at as string,
      overtime_hours: sums?.ot ?? Number(data[HR_FIELD_IDS.totalOvertime] ?? 0),
      absences: sums?.abs ?? Number(data[HR_FIELD_IDS.totalAbsences] ?? 0),
      morale: moraleFromData(data),
    };
  });

  return {
    kpis: {
      open_requests,
      submitted_this_week,
      overtime_hours_week: Math.round(overtime_hours_week * 10) / 10,
      staff_registered: staffCount ?? 0,
    },
    alerts: { high_overtime, poor_morale, missing_report },
    active_requests,
    recent_reports,
  };
}
