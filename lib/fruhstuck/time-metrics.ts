import { AFTER_HOURS_END, AFTER_HOURS_START, isAfterHoursHour, WEEKDAY_ORDER } from "./constants";

export function berlinHour(iso: string): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    hour: "numeric",
    hour12: false,
  }).format(new Date(iso));
  return parseInt(h, 10);
}

export function berlinWeekday(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    weekday: "long",
  }).format(new Date(iso));
}

export function isAfterHoursTimestamp(iso: string): boolean {
  return isAfterHoursHour(berlinHour(iso));
}

type OrderLike = { total_amount: number | string; created_at: string };

export type TimeMetricsFromOrders = {
  orders_by_hour: { hour: number; count: number }[];
  revenue_by_hour: { hour: number; revenue: number }[];
  by_weekday: { weekday: string; orders: number; revenue: number }[];
  heatmap: { weekday: string; hour: number; count: number }[];
  after_hours: { orders: number; revenue: number };
  peakOrderHour: number | null;
  peakRevenueHour: number | null;
  peakWeekday: string | null;
  slowestWeekday: string | null;
};

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fillHours(countMap: Map<number, number>) {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: countMap.get(hour) ?? 0,
  }));
}

function fillHourRevenue(revMap: Map<number, number>) {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    revenue: Math.round((revMap.get(hour) ?? 0) * 100) / 100,
  }));
}

export function computeTimeMetrics(orders: OrderLike[]): TimeMetricsFromOrders {
  const hourCount = new Map<number, number>();
  const hourRevenue = new Map<number, number>();
  const weekdayMap = new Map<string, { orders: number; revenue: number }>();
  const heatmapMap = new Map<string, number>();

  let ahOrders = 0;
  let ahRevenue = 0;

  for (const o of orders) {
    const amount = toNum(o.total_amount);
    const hour = berlinHour(o.created_at);
    const weekday = berlinWeekday(o.created_at);

    hourCount.set(hour, (hourCount.get(hour) ?? 0) + 1);
    hourRevenue.set(hour, (hourRevenue.get(hour) ?? 0) + amount);

    const wd = weekdayMap.get(weekday) ?? { orders: 0, revenue: 0 };
    weekdayMap.set(weekday, {
      orders: wd.orders + 1,
      revenue: wd.revenue + amount,
    });

    const hk = `${weekday}:${hour}`;
    heatmapMap.set(hk, (heatmapMap.get(hk) ?? 0) + 1);

    if (hour >= AFTER_HOURS_START && hour <= AFTER_HOURS_END) {
      ahOrders += 1;
      ahRevenue += amount;
    }
  }

  const orders_by_hour = fillHours(hourCount);
  const revenue_by_hour = fillHourRevenue(hourRevenue);

  const by_weekday = WEEKDAY_ORDER.map((weekday) => {
    const row = weekdayMap.get(weekday);
    return {
      weekday,
      orders: row?.orders ?? 0,
      revenue: Math.round((row?.revenue ?? 0) * 100) / 100,
    };
  });

  const heatmap: { weekday: string; hour: number; count: number }[] = [];
  for (const weekday of WEEKDAY_ORDER) {
    for (let hour = 0; hour < 24; hour++) {
      heatmap.push({
        weekday,
        hour,
        count: heatmapMap.get(`${weekday}:${hour}`) ?? 0,
      });
    }
  }

  const peakHourRow = [...orders_by_hour].sort((a, b) => b.count - a.count)[0];
  const peakRevRow = [...revenue_by_hour].sort((a, b) => b.revenue - a.revenue)[0];
  const activeWeekdays = by_weekday.filter((w) => w.orders > 0);
  const peakWd = [...activeWeekdays].sort((a, b) => b.orders - a.orders)[0];
  const slowWd = [...activeWeekdays].sort((a, b) => a.orders - b.orders)[0];

  return {
    orders_by_hour,
    revenue_by_hour,
    by_weekday,
    heatmap,
    after_hours: {
      orders: ahOrders,
      revenue: Math.round(ahRevenue * 100) / 100,
    },
    peakOrderHour: peakHourRow && peakHourRow.count > 0 ? peakHourRow.hour : null,
    peakRevenueHour: peakRevRow && peakRevRow.revenue > 0 ? peakRevRow.hour : null,
    peakWeekday: peakWd?.weekday ?? null,
    slowestWeekday: slowWd?.weekday ?? null,
  };
}

export function afterHoursPct(ahOrders: number, totalOrders: number): number {
  if (totalOrders <= 0) return 0;
  return Math.round((ahOrders / totalOrders) * 1000) / 10;
}
