import type { SupabaseClient } from "@supabase/supabase-js";

import { HR_FIELD_IDS } from "@/lib/hr/default-template";
import { getTemplateIdsForRole } from "@/lib/hr/requester-filter";
import { entryInPeriod } from "@/lib/staff/period";

export type HrAnalyticsPeriod = "week" | "month" | "custom";

export type HrAnalyticsFilters = {
  period: HrAnalyticsPeriod;
  startYmd?: string;
  endYmd?: string;
  branchId?: string | null;
};

export type HrAnalyticsPayload = {
  period_label: string;
  kpis: {
    total_overtime_hours: number;
    total_absences: number;
    total_late_arrivals: number;
    top_overtime_staff: { name: string; hours: number; branch_name: string } | null;
  };
  overtime_by_branch: { branch_name: string; overtime_hours: number }[];
  attendance_trend: { week: string; absences: number; late_arrivals: number }[];
  morale_by_week: { week: string; good: number; neutral: number; poor: number }[];
  workload_by_branch: { branch_name: string; hours_worked: number; overtime_hours: number }[];
  top_overtime_staff: { name: string; branch_name: string; hours: number }[];
  top_absences_staff: { name: string; branch_name: string; count: number }[];
};

const OVERTIME_THRESHOLD = 15;

function resolveWindow(filters: HrAnalyticsFilters): { startYmd: string; endYmd: string; label: string } {
  const today = new Date().toISOString().slice(0, 10);
  if (filters.period === "custom" && filters.startYmd && filters.endYmd) {
    return { startYmd: filters.startYmd, endYmd: filters.endYmd, label: `${filters.startYmd} – ${filters.endYmd}` };
  }
  const end = new Date(`${today}T12:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (filters.period === "month" ? 29 : 6));
  const startYmd = start.toISOString().slice(0, 10);
  return {
    startYmd,
    endYmd: today,
    label: filters.period === "month" ? "Last 30 days" : "Last 7 days",
  };
}

function weekKey(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function fetchHrAnalytics(
  supabase: SupabaseClient,
  filters: HrAnalyticsFilters,
): Promise<HrAnalyticsPayload> {
  const { startYmd, endYmd, label } = resolveWindow(filters);

  const { data: branches } = await supabase
    .from("branches")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  const branchList = filters.branchId
    ? (branches ?? []).filter((b) => b.id === filters.branchId)
    : (branches ?? []);
  const branchName = new Map(branchList.map((b) => [b.id, b.name]));

  const prefetch = new Date(`${startYmd}T12:00:00Z`);
  prefetch.setUTCDate(prefetch.getUTCDate() - 35);
  const prefetchYmd = prefetch.toISOString().slice(0, 10);

  let entriesQ = supabase
    .from("staff_report_entries")
    .select(
      "week_start, period_end, hours_worked, overtime_hours, absences, late_arrivals, branch_id, staff_member_id, staff_members(full_name)",
    )
    .gte("week_start", prefetchYmd)
    .lte("week_start", endYmd);

  if (filters.branchId) entriesQ = entriesQ.eq("branch_id", filters.branchId);
  const { data: rawEntries } = await entriesQ;
  const entries = (rawEntries ?? []).filter((e) =>
    entryInPeriod(String(e.week_start), e.period_end as string | null, startYmd, endYmd),
  );

  const hrTemplateIds = await getTemplateIdsForRole(supabase, "hr");
  let reportsQ = supabase
    .from("reports")
    .select("id, submitted_at, data")
    .eq("status", "submitted")
    .in("template_id", hrTemplateIds.length > 0 ? hrTemplateIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("submitted_at", `${startYmd}T00:00:00.000Z`)
    .lte("submitted_at", `${endYmd}T23:59:59.999Z`);

  const { data: reports } = hrTemplateIds.length > 0 ? await reportsQ : { data: [] };

  let total_overtime_hours = 0;
  let total_absences = 0;
  let total_late_arrivals = 0;
  const overtimeByBranch = new Map<string, number>();
  const hoursByBranch = new Map<string, number>();
  const staffOvertime = new Map<string, { name: string; branch_name: string; hours: number }>();
  const staffAbsences = new Map<string, { name: string; branch_name: string; count: number }>();
  const attendanceByWeek = new Map<string, { absences: number; late_arrivals: number }>();

  for (const b of branchList) {
    overtimeByBranch.set(b.id, 0);
    hoursByBranch.set(b.id, 0);
  }

  for (const e of entries ?? []) {
    const bid = e.branch_id as string;
    const ot = Number(e.overtime_hours ?? 0);
    const abs = Number(e.absences ?? 0);
    const late = Number(e.late_arrivals ?? 0);
    const wk = weekKey(String(e.week_start));

    total_overtime_hours += ot;
    total_absences += abs;
    total_late_arrivals += late;
    overtimeByBranch.set(bid, (overtimeByBranch.get(bid) ?? 0) + ot);
    hoursByBranch.set(bid, (hoursByBranch.get(bid) ?? 0) + Number(e.hours_worked ?? 0));

    const att = attendanceByWeek.get(wk) ?? { absences: 0, late_arrivals: 0 };
    att.absences += abs;
    att.late_arrivals += late;
    attendanceByWeek.set(wk, att);

    const sm = e.staff_members as { full_name?: string } | null;
    const name = sm?.full_name ?? "Staff";
    const sid = e.staff_member_id as string;
    if (sid) {
      const so = staffOvertime.get(sid) ?? { name, branch_name: branchName.get(bid) ?? "—", hours: 0 };
      so.hours += ot;
      staffOvertime.set(sid, so);
      const sa = staffAbsences.get(sid) ?? { name, branch_name: branchName.get(bid) ?? "—", count: 0 };
      sa.count += abs;
      staffAbsences.set(sid, sa);
    }
  }

  const moraleByWeek = new Map<string, { good: number; neutral: number; poor: number }>();
  for (const r of reports ?? []) {
    const wk = weekKey(String(r.submitted_at).slice(0, 10));
    const m = String((r.data as Record<string, unknown>)?.[HR_FIELD_IDS.teamMorale] ?? "").toLowerCase();
    const row = moraleByWeek.get(wk) ?? { good: 0, neutral: 0, poor: 0 };
    if (m === "good") row.good += 1;
    else if (m === "neutral") row.neutral += 1;
    else if (m === "poor") row.poor += 1;
    moraleByWeek.set(wk, row);
  }

  const topOvertimeList = [...staffOvertime.values()].sort((a, b) => b.hours - a.hours);
  const topAbsList = [...staffAbsences.values()].sort((a, b) => b.count - a.count);

  return {
    period_label: label,
    kpis: {
      total_overtime_hours: Math.round(total_overtime_hours * 10) / 10,
      total_absences,
      total_late_arrivals,
      top_overtime_staff: topOvertimeList[0]
        ? { name: topOvertimeList[0].name, hours: Math.round(topOvertimeList[0].hours * 10) / 10, branch_name: topOvertimeList[0].branch_name }
        : null,
    },
    overtime_by_branch: branchList.map((b) => ({
      branch_name: b.name,
      overtime_hours: Math.round((overtimeByBranch.get(b.id) ?? 0) * 10) / 10,
    })),
    attendance_trend: [...attendanceByWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, v]) => ({ week, ...v })),
    morale_by_week: [...moraleByWeek.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, v]) => ({ week, ...v })),
    workload_by_branch: branchList.map((b) => ({
      branch_name: b.name,
      hours_worked: Math.round((hoursByBranch.get(b.id) ?? 0) * 10) / 10,
      overtime_hours: Math.round((overtimeByBranch.get(b.id) ?? 0) * 10) / 10,
    })),
    top_overtime_staff: topOvertimeList.slice(0, 5).map((s) => ({
      name: s.name,
      branch_name: s.branch_name,
      hours: Math.round(s.hours * 10) / 10,
    })),
    top_absences_staff: topAbsList.slice(0, 5).map((s) => ({
      name: s.name,
      branch_name: s.branch_name,
      count: s.count,
    })),
  };
}

export { OVERTIME_THRESHOLD };
