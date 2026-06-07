export type PeriodKey = "week" | "month" | "3months" | "custom";

export type DateRange = { start: string; end: string; label: string };

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function resolvePeriod(
  period: string | null,
  customStart?: string | null,
  customEnd?: string | null,
): { current: DateRange; previous: DateRange } {
  const end = new Date();
  end.setUTCHours(23, 59, 59, 999);
  let start = new Date(end);
  let days = 7;

  const key = (period ?? "week") as PeriodKey;
  if (key === "month") days = 28;
  else if (key === "3months") days = 90;
  else if (key === "custom" && customStart && customEnd) {
    const cur = { start: customStart.slice(0, 10), end: customEnd.slice(0, 10), label: "Custom" };
    const span = Math.max(1, Math.floor((Date.parse(cur.end) - Date.parse(cur.start)) / 86400000) + 1);
    const prevEnd = new Date(`${cur.start}T00:00:00.000Z`);
    prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setUTCDate(prevStart.getUTCDate() - span + 1);
    return {
      current: cur,
      previous: { start: toIsoDate(prevStart), end: toIsoDate(prevEnd), label: "Previous" },
    };
  } else {
    start.setUTCDate(start.getUTCDate() - (days - 1));
  }

  const current: DateRange = {
    start: key === "custom" && customStart ? customStart.slice(0, 10) : toIsoDate(start),
    end: key === "custom" && customEnd ? customEnd.slice(0, 10) : toIsoDate(end),
    label: key === "week" ? "This week" : key === "month" ? "Last 4 weeks" : key === "3months" ? "Last 3 months" : "Period",
  };

  const span = Math.max(1, Math.floor((Date.parse(current.end) - Date.parse(current.start)) / 86400000) + 1);
  const prevEnd = new Date(`${current.start}T00:00:00.000Z`);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - span + 1);

  return {
    current,
    previous: { start: toIsoDate(prevStart), end: toIsoDate(prevEnd), label: "Previous period" },
  };
}

export function isoWeekLabel(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function trendPct(current: number, previous: number): { text: string; up: boolean } | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { text: `↑ +100%`, up: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: "0%", up: true };
  return pct > 0 ? { text: `↑ +${pct}%`, up: true } : { text: `↓ ${pct}%`, up: false };
}
