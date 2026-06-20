export type PeriodInput = {
  period_start: string;
  period_end: string;
};

export function parseDateOnly(value: string): string | null {
  const v = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return v;
}

export function validatePeriod(startRaw: string, endRaw: string): PeriodInput | { error: string } {
  const period_start = parseDateOnly(startRaw);
  const period_end = parseDateOnly(endRaw);
  if (!period_start || !period_end) {
    return { error: "Valid period start and end dates are required (YYYY-MM-DD)" };
  }
  if (period_end < period_start) {
    return { error: "End date must be on or after start date" };
  }
  const startMs = new Date(`${period_start}T00:00:00.000Z`).getTime();
  const endMs = new Date(`${period_end}T00:00:00.000Z`).getTime();
  const days = (endMs - startMs) / (24 * 60 * 60 * 1000) + 1;
  if (days > 62) {
    return { error: "Report period cannot exceed 62 days" };
  }
  return { period_start, period_end };
}

export function periodEndOrStart(periodStart: string, periodEnd: string | null | undefined): string {
  return periodEnd?.trim() || periodStart;
}

export function formatPeriodLabel(periodStart: string, periodEnd?: string | null): string {
  const end = periodEndOrStart(periodStart, periodEnd);
  const fmt = (d: string) => {
    try {
      return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
        new Date(`${d}T00:00:00.000Z`),
      );
    } catch {
      return d;
    }
  };
  if (end === periodStart) return fmt(periodStart);
  return `${fmt(periodStart)} – ${fmt(end)}`;
}

/** Compact label for period comparison headers, e.g. "Jun W1 2026". */
export function compactPeriodLabel(periodStart: string): string {
  try {
    const d = new Date(`${periodStart}T00:00:00.000Z`);
    const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(d);
    const year = d.getUTCFullYear();
    const weekOfMonth = Math.min(4, Math.ceil(d.getUTCDate() / 7));
    return `${month} W${weekOfMonth} ${year}`;
  } catch {
    return periodStart;
  }
}

/** Entry overlaps filter range when any day intersects. */
export function entryInPeriod(
  periodStart: string,
  periodEnd: string | null | undefined,
  filterFrom: string,
  filterTo: string,
): boolean {
  const end = periodEndOrStart(periodStart, periodEnd);
  return periodStart <= filterTo && end >= filterFrom;
}

/** Monday–Sunday containing today (UTC). */
export function currentCalendarWeek(): PeriodInput {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { period_start: iso(monday), period_end: iso(sunday) };
}

/** Previous Monday–Sunday (UTC). */
export function lastCalendarWeek(): PeriodInput {
  const current = currentCalendarWeek();
  const monday = new Date(`${current.period_start}T00:00:00.000Z`);
  monday.setUTCDate(monday.getUTCDate() - 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { period_start: iso(monday), period_end: iso(sunday) };
}

function berlinTodayParts(): { y: number; m: number } {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m] = iso.split("-").map((x) => parseInt(x, 10));
  return { y: y ?? new Date().getFullYear(), m: m ?? 1 };
}

/** First–last day of the current month in Europe/Berlin. */
export function currentBerlinMonth(): PeriodInput {
  const { y, m } = berlinTodayParts();
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { period_start: start, period_end: end };
}

/** Full previous calendar month in Europe/Berlin. */
export function lastBerlinMonth(): PeriodInput {
  const { y, m } = berlinTodayParts();
  const prevM = m === 1 ? 12 : m - 1;
  const prevY = m === 1 ? y - 1 : y;
  const start = `${prevY}-${String(prevM).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(prevY, prevM, 0)).getUTCDate();
  const end = `${prevY}-${String(prevM).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { period_start: start, period_end: end };
}

export type EntryTotals = {
  hours: number;
  overtime: number;
  absences: number;
  late: number;
};

export function sumEntriesInPeriod<
  T extends {
    week_start: string;
    period_end?: string | null;
    hours_worked: number;
    overtime_hours: number;
    absences: number;
    late_arrivals: number;
  },
>(entries: T[], filterFrom: string, filterTo: string): EntryTotals {
  return entries
    .filter((e) => entryInPeriod(e.week_start, e.period_end, filterFrom, filterTo))
    .reduce(
      (acc, e) => ({
        hours: acc.hours + Number(e.hours_worked ?? 0),
        overtime: acc.overtime + Number(e.overtime_hours ?? 0),
        absences: acc.absences + Number(e.absences ?? 0),
        late: acc.late + Number(e.late_arrivals ?? 0),
      }),
      { hours: 0, overtime: 0, absences: 0, late: 0 },
    );
}

export function lastNDaysPeriod(days: number): PeriodInput {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { period_start: iso(start), period_end: iso(end) };
}
