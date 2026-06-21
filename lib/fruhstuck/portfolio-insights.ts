import { isAfterHoursHour, WEEKDAY_ORDER } from "./constants";
import type { FruhstuckBranchPayload } from "./types";
import { afterHoursPct } from "./time-metrics";

export type PortfolioInsights = {
  totalOrders: number;
  totalItemsSold: number;
  activeBranches: number;
  ordersByHour: { hour: number; count: number; isAfterHours: boolean }[];
  afterHours: {
    orders: number;
    pctOfOrders: number;
  };
  afterHoursByBranch: {
    branchId: string;
    branchName: string;
    orders: number;
    pctOfBranchOrders: number;
  }[];
  peakOrderHour: number | null;
  peakWeekday: string | null;
  slowestWeekday: string | null;
  weekdayChart: { weekday: string; orders: number }[];
  heatmap: { weekday: string; hour: number; count: number }[];
};

export function buildPortfolioInsights(rows: FruhstuckBranchPayload[]): PortfolioInsights {
  let totalOrders = 0;
  let totalItemsSold = 0;

  const hourCounts = new Array<number>(24).fill(0);
  const weekdayOrders = new Map<string, number>();
  const heatmap = new Map<string, number>();

  let ahOrders = 0;

  const afterHoursByBranch: PortfolioInsights["afterHoursByBranch"] = [];

  for (const row of rows) {
    totalOrders += row.orders_count;
    totalItemsSold += row.raw_data.summary.itemsSold;

    const ta = row.raw_data.timeAnalytics;
    const ah = ta.afterHours;

    ahOrders += ah.orders;

    afterHoursByBranch.push({
      branchId: row.branch_id,
      branchName: row.branch_name,
      orders: ah.orders,
      pctOfBranchOrders: afterHoursPct(ah.orders, row.orders_count),
    });

    for (const h of ta.ordersByHour) {
      hourCounts[h.hour] = (hourCounts[h.hour] ?? 0) + h.count;
    }
    for (const w of ta.byWeekday ?? []) {
      weekdayOrders.set(w.weekday, (weekdayOrders.get(w.weekday) ?? 0) + w.orders);
    }
    for (const cell of ta.heatmap ?? []) {
      const key = `${cell.weekday}:${cell.hour}`;
      heatmap.set(key, (heatmap.get(key) ?? 0) + cell.count);
    }
  }

  const activeBranches = rows.filter((r) => r.orders_count > 0).length;

  const ordersByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: hourCounts[hour] ?? 0,
    isAfterHours: isAfterHoursHour(hour),
  }));

  const weekdayChart = WEEKDAY_ORDER.map((weekday) => ({
    weekday,
    orders: weekdayOrders.get(weekday) ?? 0,
  }));

  const heatmapCells: { weekday: string; hour: number; count: number }[] = [];
  for (const [key, count] of heatmap) {
    const colon = key.indexOf(":");
    if (colon < 0) continue;
    const weekday = key.slice(0, colon);
    const hour = parseInt(key.slice(colon + 1), 10);
    if (!weekday || Number.isNaN(hour)) continue;
    heatmapCells.push({ weekday, hour, count });
  }

  const peakOrderHour = ordersByHour.reduce(
    (best, h) => (h.count > best.count ? h : best),
    { hour: 0, count: 0, isAfterHours: false },
  );

  const activeWd = weekdayChart.filter((w) => w.orders > 0);
  const peakWeekday = activeWd.length
    ? [...activeWd].sort((a, b) => b.orders - a.orders)[0]!.weekday
    : null;
  const slowestWeekday = activeWd.length
    ? [...activeWd].sort((a, b) => a.orders - b.orders)[0]!.weekday
    : null;

  return {
    totalOrders,
    totalItemsSold,
    activeBranches,
    ordersByHour,
    afterHours: {
      orders: ahOrders,
      pctOfOrders: afterHoursPct(ahOrders, totalOrders),
    },
    afterHoursByBranch: afterHoursByBranch.sort((a, b) => b.orders - a.orders),
    peakOrderHour: peakOrderHour.count > 0 ? peakOrderHour.hour : null,
    peakWeekday,
    slowestWeekday,
    weekdayChart,
    heatmap: heatmapCells,
  };
}
