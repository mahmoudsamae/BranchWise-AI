import type { BranchBreakfastComparison } from "./branch-order-types";
import { addBerlinDays, berlinTodayYmd } from "./berlin-range";
import { comparisonWindows, pctChange, type ComparisonMode } from "./comparison-windows";
import { fetchAllOrders, resolveBreakfastBranchId } from "./branch-orders-query";
import { getBreakfastSupabase } from "@/lib/breakfast-supabase";

export type BranchDayOps = {
  orders: number;
  revenue: number;
  pending: number;
  delivered: number;
  not_picked_up: number;
  floor_orders: number;
  floor_revenue: number;
};

export type BranchOperationsSnapshot = {
  tomorrow_ymd: string;
  today_ymd: string;
  tomorrow: BranchDayOps;
  today: BranchDayOps;
};

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function summarizeDay(
  orders: { status: string; source: string; total_amount: number | string }[],
): BranchDayOps {
  let revenue = 0;
  let pending = 0;
  let delivered = 0;
  let notPicked = 0;
  let floorOrders = 0;
  let floorRevenue = 0;

  for (const o of orders) {
    const amount = toNum(o.total_amount);
    revenue += amount;
    if (o.status === "pending") pending++;
    else if (o.status === "delivered") delivered++;
    else if (o.status === "not_picked_up") notPicked++;
    if (o.source === "staff") {
      floorOrders++;
      floorRevenue += amount;
    }
  }

  return {
    orders: orders.length,
    revenue: Math.round(revenue * 100) / 100,
    pending,
    delivered,
    not_picked_up: notPicked,
    floor_orders: floorOrders,
    floor_revenue: Math.round(floorRevenue * 100) / 100,
  };
}

export async function loadBranchOperationsSnapshot(branchSlug: string): Promise<BranchOperationsSnapshot> {
  const branchId = await resolveBreakfastBranchId(branchSlug);
  if (!branchId) {
    const tomorrow = addBerlinDays(berlinTodayYmd(), 1);
    const empty: BranchDayOps = {
      orders: 0,
      revenue: 0,
      pending: 0,
      delivered: 0,
      not_picked_up: 0,
      floor_orders: 0,
      floor_revenue: 0,
    };
    return { tomorrow_ymd: tomorrow, today_ymd: berlinTodayYmd(), tomorrow: empty, today: empty };
  }

  const supabase = getBreakfastSupabase();
  const today = berlinTodayYmd();
  const tomorrow = addBerlinDays(today, 1);

  const [tomorrowRaw, todayRaw] = await Promise.all([
    fetchAllOrders(supabase, branchId, { pickup_date: tomorrow }),
    fetchAllOrders(supabase, branchId, { pickup_date: today }),
  ]);

  return {
    tomorrow_ymd: tomorrow,
    today_ymd: today,
    tomorrow: summarizeDay(tomorrowRaw),
    today: summarizeDay(todayRaw),
  };
}

function aggregateByDay(orders: { pickup_date: string; total_amount: number | string }[]) {
  const map = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const cur = map.get(o.pickup_date) ?? { orders: 0, revenue: 0 };
    map.set(o.pickup_date, {
      orders: cur.orders + 1,
      revenue: cur.revenue + toNum(o.total_amount),
    });
  }
  return map;
}

function buildComparisonChart(
  current: Map<string, { orders: number; revenue: number }>,
  previous: Map<string, { orders: number; revenue: number }>,
  mode: ComparisonMode,
): BranchBreakfastComparison["chart"] {
  const curDays = [...current.entries()].sort(([a], [b]) => a.localeCompare(b));
  const prevDays = [...previous.entries()].sort(([a], [b]) => a.localeCompare(b));

  if (mode === "wow") {
    const weekdays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
    return weekdays.map((label, i) => ({
      label,
      current: curDays[i]?.[1].orders ?? 0,
      previous: prevDays[i]?.[1].orders ?? 0,
    }));
  }

  const len = Math.max(curDays.length, prevDays.length, 1);
  return Array.from({ length: len }, (_, i) => ({
    label: String(i + 1),
    current: curDays[i]?.[1].orders ?? 0,
    previous: prevDays[i]?.[1].orders ?? 0,
  }));
}

export async function loadPeriodComparison(
  branchSlug: string,
  anchorYmd: string,
  mode: ComparisonMode,
): Promise<BranchBreakfastComparison> {
  const branchId = await resolveBreakfastBranchId(branchSlug);
  if (!branchId) throw new Error("Frühstücks-Filiale nicht gefunden");

  const supabase = getBreakfastSupabase();
  const { current, previous } = comparisonWindows(anchorYmd, mode);

  const [curRaw, prevRaw] = await Promise.all([
    fetchAllOrders(supabase, branchId, { pickup_gte: current.startYmd, pickup_lte: current.endYmd }),
    fetchAllOrders(supabase, branchId, { pickup_gte: previous.startYmd, pickup_lte: previous.endYmd }),
  ]);

  const curOrders = curRaw.length;
  const prevOrders = prevRaw.length;
  const curRev = Math.round(curRaw.reduce((s, o) => s + toNum(o.total_amount), 0) * 100) / 100;
  const prevRev = Math.round(prevRaw.reduce((s, o) => s + toNum(o.total_amount), 0) * 100) / 100;

  return {
    mode,
    label: `${current.label} vs. ${previous.label}`,
    current: { start: current.startYmd, end: current.endYmd, orders: curOrders, revenue: curRev },
    previous: { start: previous.startYmd, end: previous.endYmd, orders: prevOrders, revenue: prevRev },
    orders_pct: pctChange(curOrders, prevOrders),
    revenue_pct: pctChange(curRev, prevRev),
    chart: buildComparisonChart(aggregateByDay(curRaw), aggregateByDay(prevRaw), mode),
  };
}
