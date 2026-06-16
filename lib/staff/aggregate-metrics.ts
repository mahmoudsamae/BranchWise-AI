import { entryInPeriod, periodEndOrStart } from "@/lib/staff/period";

export type StaffReportRow = {
  staff_member_id: string;
  hours_worked: number | null;
  overtime_hours: number | null;
  absences: number | null;
  late_arrivals: number | null;
  week_start: string;
  period_end?: string | null;
  created_at?: string | null;
};

export type StaffMetrics = {
  total_hours: number;
  total_overtime: number;
  total_absences: number;
  total_late: number;
  report_count: number;
  last_period_start: string | null;
  last_period_end: string | null;
};

export function emptyStaffMetrics(): StaffMetrics {
  return {
    total_hours: 0,
    total_overtime: 0,
    total_absences: 0,
    total_late: 0,
    report_count: 0,
    last_period_start: null,
    last_period_end: null,
  };
}

export function filterReportRowsByPeriod(
  rows: StaffReportRow[],
  periodFrom: string,
  periodTo: string,
): StaffReportRow[] {
  return rows.filter((row) => entryInPeriod(row.week_start, row.period_end, periodFrom, periodTo));
}

export function aggregateStaffMetrics(rows: StaffReportRow[]): Map<string, StaffMetrics> {
  const map = new Map<string, StaffMetrics>();

  for (const row of rows) {
    const id = row.staff_member_id;
    if (!id) continue;

    const cur = map.get(id) ?? emptyStaffMetrics();
    cur.total_hours += Number(row.hours_worked ?? 0);
    cur.total_overtime += Number(row.overtime_hours ?? 0);
    cur.total_absences += Number(row.absences ?? 0);
    cur.total_late += Number(row.late_arrivals ?? 0);
    cur.report_count += 1;

    const rowEnd = periodEndOrStart(row.week_start, row.period_end);
    const lastEnd = cur.last_period_start ? periodEndOrStart(cur.last_period_start, cur.last_period_end) : null;
    if (!cur.last_period_start || rowEnd > (lastEnd ?? "")) {
      cur.last_period_start = row.week_start;
      cur.last_period_end = row.period_end ?? row.week_start;
    }
    map.set(id, cur);
  }

  return map;
}
