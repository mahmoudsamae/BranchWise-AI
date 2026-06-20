import { createServiceRoleClient } from "@/lib/supabase";
import {
  aggregateStaffMetrics,
  filterReportRowsByPeriod,
  type StaffReportRow,
} from "@/lib/staff/aggregate-metrics";
import { fetchBranchReportEntries } from "@/lib/staff/fetch-branch-entries";
import { roundStaffHours } from "@/lib/staff/format-hours";
import { entryInPeriod } from "@/lib/staff/period";

export type OvertimeSummary = {
  monthHours: number;
  allTimeHours: number;
  staffWithOvertimeMonth: number;
  nearLimitCount: number;
  nearLimitNames: string[];
  lastUpdated: string | null;
  monthLabel: string;
  period: { from: string; to: string };
};

const NEAR_LIMIT_THRESHOLD_HOURS = 10;

function berlinTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getBerlinMonthRange(): { start: string; end: string; label: string } {
  return berlinMonthRange();
}

function berlinMonthRange(): { start: string; end: string; label: string } {
  const today = berlinTodayYmd();
  const parts = today.split("-").map((x) => parseInt(x, 10));
  const y = parts[0] ?? new Date().getFullYear();
  const m = parts[1] ?? 1;
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const label = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    month: "long",
    year: "numeric",
  }).format(new Date(`${start}T12:00:00Z`));
  return { start, end, label };
}

export function buildOvertimeSummaryFromEntries(
  entries: StaffReportRow[],
  staffNames: Map<string, string>,
  monthRange: { start: string; end: string; label: string },
): OvertimeSummary {
  const monthRows = filterReportRowsByPeriod(entries, monthRange.start, monthRange.end);
  const monthMetrics = aggregateStaffMetrics(monthRows);
  const allMetrics = aggregateStaffMetrics(entries);

  let monthHours = 0;
  let staffWithOvertimeMonth = 0;
  const nearLimit: { name: string; hours: number }[] = [];
  let lastUpdated: string | null = null;

  for (const row of monthRows) {
    if (row.created_at && (!lastUpdated || row.created_at > lastUpdated)) {
      lastUpdated = row.created_at;
    }
  }

  for (const [staffId, metrics] of monthMetrics) {
    monthHours += metrics.total_overtime;
    if (metrics.total_overtime > 0) staffWithOvertimeMonth++;
    if (metrics.total_overtime >= NEAR_LIMIT_THRESHOLD_HOURS) {
      nearLimit.push({
        name: staffNames.get(staffId) ?? "Mitarbeiter",
        hours: metrics.total_overtime,
      });
    }
  }

  nearLimit.sort((a, b) => b.hours - a.hours);

  let allTimeHours = 0;
  for (const metrics of allMetrics.values()) {
    allTimeHours += metrics.total_overtime;
  }

  return {
    monthHours: roundStaffHours(monthHours),
    allTimeHours: roundStaffHours(allTimeHours),
    staffWithOvertimeMonth,
    nearLimitCount: nearLimit.length,
    nearLimitNames: nearLimit.slice(0, 3).map((n) => n.name),
    lastUpdated,
    monthLabel: monthRange.label,
    period: { from: monthRange.start, to: monthRange.end },
  };
}

export async function getOvertimeSummary(branchId: string): Promise<OvertimeSummary> {
  const supabase = createServiceRoleClient();
  const monthRange = berlinMonthRange();

  const [{ data: staff }, entries] = await Promise.all([
    supabase.from("staff_members").select("id, full_name").eq("branch_id", branchId),
    fetchBranchReportEntries(supabase, branchId),
  ]);

  const staffNames = new Map((staff ?? []).map((s) => [s.id, s.full_name]));

  return buildOvertimeSummaryFromEntries(entries, staffNames, monthRange);
}

/** For staff profile: split totals by current month vs all entries. */
export function staffOvertimeTotals(
  entries: StaffReportRow[],
  monthFrom: string,
  monthTo: string,
): { month: number; allTime: number } {
  let allTime = 0;
  let month = 0;
  for (const e of entries) {
    const ot = Number(e.overtime_hours ?? 0);
    allTime += ot;
    if (entryInPeriod(e.week_start, e.period_end, monthFrom, monthTo)) {
      month += ot;
    }
  }
  return { month: roundStaffHours(month), allTime: roundStaffHours(allTime) };
}
