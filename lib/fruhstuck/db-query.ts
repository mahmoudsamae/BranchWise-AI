import { getBreakfastSupabase } from "@/lib/breakfast-supabase";

import { afterHoursPct, computeTimeMetrics } from "./time-metrics";
import { fetchAllBreakfastOrders, fetchAllOrderItems } from "./paginated-orders";
import type { BreakfastAnalyticsData } from "./types";

export type BreakfastDateWindow = { startYmd: string; endYmd: string };

export type BreakfastDbAggregate = {
  orders_count: number;
  revenue: number;
  items_sold: number;
  top_products: { name: string; count: number; revenue: number }[];
  revenue_per_day: { date: string; revenue: number }[];
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

const emptyAggregate = (): BreakfastDbAggregate => ({
  orders_count: 0,
  revenue: 0,
  items_sold: 0,
  top_products: [],
  revenue_per_day: [],
  orders_by_hour: Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 })),
  revenue_by_hour: Array.from({ length: 24 }, (_, hour) => ({ hour, revenue: 0 })),
  by_weekday: [],
  heatmap: [],
  after_hours: { orders: 0, revenue: 0 },
  peakOrderHour: null,
  peakRevenueHour: null,
  peakWeekday: null,
  slowestWeekday: null,
});

type OrderRow = { id: number; total_amount: number | string; created_at: string; pickup_date: string };

type ItemRow = {
  quantity: number;
  unit_price: number | string;
  order_id: number;
  products: { name: string; category?: string } | { name: string; category?: string }[] | null;
  menus: { name: string } | { name: string }[] | null;
};

function relName(rel: { name: string } | { name: string }[] | null | undefined): string | null {
  if (!rel) return null;
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.name ?? null;
}

/** Read-only via Supabase API — fetches every order in the pickup_date window (paginated). */
export async function queryBreakfastBranchData(
  branchSlug: string,
  window: BreakfastDateWindow,
): Promise<BreakfastDbAggregate> {
  const supabase = getBreakfastSupabase();
  const { startYmd, endYmd } = window;
  const slug = branchSlug.trim().toLowerCase();

  const { data: branch, error: branchErr } = await supabase
    .from("branches")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (branchErr) throw new Error(branchErr.message);
  if (!branch?.id) return emptyAggregate();

  const orders = await fetchAllBreakfastOrders<OrderRow>(
    supabase,
    branch.id,
    "id, total_amount, created_at, pickup_date",
    { pickup_gte: startYmd, pickup_lte: endYmd },
  );

  const orderIds = orders.map((o) => o.id);
  const items = orderIds.length > 0 ? await fetchAllOrderItems(supabase, orderIds) : [];

  const time = computeTimeMetrics(orders);

  const productMap = new Map<string, { count: number; revenue: number }>();
  for (const item of items as ItemRow[]) {
    const name = relName(item.products) ?? relName(item.menus) ?? "Unknown";
    const qty = toNum(item.quantity);
    const rev = qty * toNum(item.unit_price);
    const cur = productMap.get(name) ?? { count: 0, revenue: 0 };
    productMap.set(name, { count: cur.count + qty, revenue: cur.revenue + rev });
  }

  const top_products = [...productMap.entries()]
    .map(([name, v]) => ({
      name,
      count: v.count,
      revenue: Math.round(v.revenue * 100) / 100,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 15);

  const dayMap = new Map<string, number>();
  for (const o of orders) {
    const d = o.pickup_date;
    dayMap.set(d, (dayMap.get(d) ?? 0) + toNum(o.total_amount));
  }
  const revenue_per_day = [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rev]) => ({ date, revenue: Math.round(rev * 100) / 100 }));

  const revenue = Math.round(orders.reduce((s, o) => s + toNum(o.total_amount), 0) * 100) / 100;

  return {
    orders_count: orders.length,
    revenue,
    items_sold: items.reduce((s, i) => s + toNum(i.quantity), 0),
    top_products,
    revenue_per_day,
    orders_by_hour: time.orders_by_hour,
    revenue_by_hour: time.revenue_by_hour,
    by_weekday: time.by_weekday,
    heatmap: time.heatmap,
    after_hours: time.after_hours,
    peakOrderHour: time.peakOrderHour,
    peakRevenueHour: time.peakRevenueHour,
    peakWeekday: time.peakWeekday,
    slowestWeekday: time.slowestWeekday,
  };
}

export function aggregateToRawData(agg: BreakfastDbAggregate): BreakfastAnalyticsData {
  const peakHour = [...agg.orders_by_hour].sort((a, b) => b.count - a.count)[0] ?? null;
  const ah = agg.after_hours;

  return {
    summary: {
      orders: agg.orders_count,
      revenue: agg.revenue,
      itemsSold: agg.items_sold,
      averageOrderValue:
        agg.orders_count > 0 ? Math.round((agg.revenue / agg.orders_count) * 100) / 100 : 0,
    },
    products: {
      topProducts: agg.top_products.slice(0, 5).map((p) => ({ name: p.name, count: p.count })),
      productsBreakdown: agg.top_products.map((p) => ({
        name: p.name,
        count: p.count,
        revenue: p.revenue,
        shareOfSalesPct: agg.revenue > 0 ? Math.round((p.revenue / agg.revenue) * 1000) / 10 : 0,
      })),
    },
    revenue: {
      revenuePerDay: agg.revenue_per_day,
      revenuePerHour: agg.revenue_by_hour,
    },
    timeAnalytics: {
      ordersByHour: agg.orders_by_hour,
      ordersByDay: agg.revenue_per_day.map((d) => ({ date: d.date, count: 0 })),
      revenuePerHour: agg.revenue_by_hour,
      byWeekday: agg.by_weekday,
      heatmap: agg.heatmap,
      afterHours: {
        orders: ah.orders,
        revenue: ah.revenue,
        pctOfOrders: afterHoursPct(ah.orders, agg.orders_count),
        averageOrderValue:
          ah.orders > 0 ? Math.round((ah.revenue / ah.orders) * 100) / 100 : 0,
      },
      peakHour: peakHour ? { hour: peakHour.hour, count: peakHour.count } : null,
      peakDay: null,
      peakOrderHour: agg.peakOrderHour,
      peakRevenueHour: agg.peakRevenueHour,
      peakWeekday: agg.peakWeekday,
      slowestWeekday: agg.slowestWeekday,
    },
    comparisons: {
      ordersLast7VsPrev7Pct: null,
      revenueLast7VsPrev7Pct: null,
    },
    registration: {
      onlineRegistrationFormsToday: 0,
      breakfastOrdersFromRegistration: 0,
    },
  };
}
