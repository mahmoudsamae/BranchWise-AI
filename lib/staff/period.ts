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

export function lastNDaysPeriod(days: number): PeriodInput {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { period_start: iso(start), period_end: iso(end) };
}
