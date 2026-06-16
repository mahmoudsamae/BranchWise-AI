import { berlinTodayYmd, rangeToBerlinWindow } from "./berlin-range";
import type { BreakfastRange } from "./types";
import { BREAKFAST_RANGES } from "./types";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Earliest date for "all time" (breakfast project era). */
const ALL_TIME_START = "2020-01-01";

export type ResolvedBreakfastRange = {
  kind: "preset" | "custom" | "all";
  preset?: BreakfastRange;
  startYmd: string;
  endYmd: string;
  label: string;
};

function isValidYmd(v: string): boolean {
  if (!YMD_RE.test(v)) return false;
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime());
}

function formatLabelRange(startYmd: string, endYmd: string): string {
  const fmt = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const s = fmt.format(new Date(`${startYmd}T12:00:00Z`));
  const e = fmt.format(new Date(`${endYmd}T12:00:00Z`));
  return startYmd === endYmd ? s : `${s} – ${e}`;
}

export function resolveBreakfastRange(
  rangeParam: string | null,
  startDate: string | null,
  endDate: string | null,
): ResolvedBreakfastRange | { error: string } {
  const raw = (rangeParam ?? "all").toLowerCase();

  if (raw === "all") {
    const today = berlinTodayYmd();
    return {
      kind: "all",
      startYmd: ALL_TIME_START,
      endYmd: today,
      label: "Gesamter Zeitraum",
    };
  }

  if (raw === "custom") {
    const start = startDate?.trim() ?? "";
    const end = endDate?.trim() ?? "";
    if (!isValidYmd(start) || !isValidYmd(end)) {
      return { error: "Custom range requires start_date and end_date (YYYY-MM-DD)" };
    }
    if (start > end) {
      return { error: "start_date must be on or before end_date" };
    }
    const today = berlinTodayYmd();
    if (end > today) {
      return { error: "end_date cannot be in the future" };
    }
    return {
      kind: "custom",
      startYmd: start,
      endYmd: end,
      label: formatLabelRange(start, end),
    };
  }

  if (!BREAKFAST_RANGES.includes(raw as BreakfastRange)) {
    return {
      error: "Invalid range. Use today|yesterday|last7days|last30days|all|custom",
    };
  }

  const preset = raw as BreakfastRange;
  const { startYmd, endYmd } = rangeToBerlinWindow(preset);
  const labels: Record<BreakfastRange, string> = {
    today: "Today",
    yesterday: "Yesterday",
    last7days: "Last 7 days",
    last30days: "Last 30 days",
  };

  return {
    kind: "preset",
    preset,
    startYmd,
    endYmd,
    label: labels[preset],
  };
}

export function buildRangeSearchParams(input: {
  kind: "preset" | "custom" | "all";
  preset?: BreakfastRange;
  startYmd?: string;
  endYmd?: string;
}): URLSearchParams {
  const p = new URLSearchParams();
  if (input.kind === "all") {
    p.set("range", "all");
  } else if (input.kind === "custom") {
    p.set("range", "custom");
    if (input.startYmd) p.set("start_date", input.startYmd);
    if (input.endYmd) p.set("end_date", input.endYmd);
  } else {
    p.set("range", input.preset ?? "last30days");
  }
  return p;
}
