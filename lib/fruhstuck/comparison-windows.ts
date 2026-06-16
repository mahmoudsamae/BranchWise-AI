import { addBerlinDays } from "./berlin-range";

export type ComparisonMode = "wow" | "mom" | "yoy";

export type DateWindow = { startYmd: string; endYmd: string; label: string };

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const [ys, ms, ds] = ymd.split("-");
  return { y: Number(ys), m: Number(ms), d: Number(ds) };
}

function formatYmd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Monday of the ISO week containing `ymd` (Berlin calendar). */
function berlinWeekStart(ymd: string): string {
  const { y, m, d } = parseYmd(ymd);
  const utc = Date.UTC(y, m - 1, d, 12, 0, 0);
  const day = new Date(utc).getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addBerlinDays(ymd, diff);
}

function monthStart(ymd: string): string {
  const { y, m } = parseYmd(ymd);
  return formatYmd(y, m, 1);
}

function monthEnd(ymd: string): string {
  const { y, m } = parseYmd(ymd);
  const last = new Date(Date.UTC(y, m, 0, 12, 0, 0)).getUTCDate();
  return formatYmd(y, m, last);
}

function shiftMonth(ymd: string, delta: number): string {
  const { y, m, d } = parseYmd(ymd);
  const dt = new Date(Date.UTC(y, m - 1 + delta, Math.min(d, 28), 12, 0, 0));
  const lastDay = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0, 12, 0, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, lastDay));
  return formatYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

const DE_SHORT = new Intl.DateTimeFormat("de-DE", {
  timeZone: "Europe/Berlin",
  day: "numeric",
  month: "short",
});

function fmtRange(start: string, end: string): string {
  const s = DE_SHORT.format(new Date(`${start}T12:00:00Z`));
  const e = DE_SHORT.format(new Date(`${end}T12:00:00Z`));
  return start === end ? s : `${s} – ${e}`;
}

export function comparisonWindows(anchorYmd: string, mode: ComparisonMode): {
  current: DateWindow;
  previous: DateWindow;
} {
  if (mode === "wow") {
    const start = berlinWeekStart(anchorYmd);
    const end = addBerlinDays(start, 6);
    const prevEnd = addBerlinDays(start, -1);
    const prevStart = addBerlinDays(prevEnd, -6);
    return {
      current: { startYmd: start, endYmd: end, label: `KW ${fmtRange(start, end)}` },
      previous: { startYmd: prevStart, endYmd: prevEnd, label: `Vorwoche ${fmtRange(prevStart, prevEnd)}` },
    };
  }

  if (mode === "mom") {
    const curStart = monthStart(anchorYmd);
    const curEnd = monthEnd(anchorYmd);
    const prevAnchor = shiftMonth(anchorYmd, -1);
    const prevStart = monthStart(prevAnchor);
    const prevEnd = monthEnd(prevAnchor);
    return {
      current: { startYmd: curStart, endYmd: curEnd, label: fmtRange(curStart, curEnd) },
      previous: { startYmd: prevStart, endYmd: prevEnd, label: fmtRange(prevStart, prevEnd) },
    };
  }

  const curStart = monthStart(anchorYmd);
  const curEnd = monthEnd(anchorYmd);
  const prevAnchor = shiftMonth(anchorYmd, -12);
  const prevStart = monthStart(prevAnchor);
  const prevEnd = monthEnd(prevAnchor);
  return {
    current: { startYmd: curStart, endYmd: curEnd, label: fmtRange(curStart, curEnd) },
    previous: { startYmd: prevStart, endYmd: prevEnd, label: `Vorjahr ${fmtRange(prevStart, prevEnd)}` },
  };
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
