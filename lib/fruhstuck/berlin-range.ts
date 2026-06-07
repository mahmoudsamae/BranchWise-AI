import type { BreakfastRange } from "./types";

export function berlinTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addBerlinDays(ymd: string, days: number): string {
  const parts = ymd.split("-").map((x) => parseInt(x, 10));
  const y = parts[0] ?? 2026;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const u = Date.UTC(y, m - 1, d + days, 12, 0, 0);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(u));
}

export function rangeToBerlinWindow(range: BreakfastRange): { startYmd: string; endYmd: string } {
  const today = berlinTodayYmd();
  switch (range) {
    case "today":
      return { startYmd: today, endYmd: today };
    case "yesterday": {
      const y = addBerlinDays(today, -1);
      return { startYmd: y, endYmd: y };
    }
    case "last7days":
      return { startYmd: addBerlinDays(today, -6), endYmd: today };
    case "last30days":
      return { startYmd: addBerlinDays(today, -29), endYmd: today };
    default:
      return { startYmd: today, endYmd: today };
  }
}

/** Berlin calendar date (YYYY-MM-DD) for a UTC timestamp. */
export function toBerlinYmd(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function isBerlinYmdInRange(ymd: string, startYmd: string, endYmd: string): boolean {
  return ymd >= startYmd && ymd <= endYmd;
}

/** Loose UTC window (±1 day) so Supabase queries stay simple; filter by Berlin date in app code. */
export function looseUtcWindow(startYmd: string, endYmd: string): { startIso: string; endIso: string } {
  const start = new Date(`${startYmd}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - 1);
  const end = new Date(`${endYmd}T23:59:59.999Z`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}
