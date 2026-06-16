import type { SupabaseClient } from "@supabase/supabase-js";

import { getBreakfastSupabase } from "@/lib/breakfast-supabase";

import type {
  BranchBreakfastComparison,
  BranchBreakfastOrder,
  BranchBreakfastSummary,
} from "./branch-order-types";
import { addBerlinDays, berlinTodayYmd } from "./berlin-range";
import { comparisonWindows, pctChange, type ComparisonMode } from "./comparison-windows";
import { fetchAllBreakfastOrders } from "./paginated-orders";

type RawOrder = {
  id: number;
  branch_id: number;
  order_number: number;
  customer_name: string;
  pickup_date: string;
  status: string;
  source: string;
  total_amount: number | string;
  created_at: string;
  delivered_at: string | null;
  paid_at: string | null;
};

type RawItem = {
  order_id: number;
  quantity: number;
  products: { name: string } | { name: string }[] | null;
  menus: { name: string } | { name: string }[] | null;
};

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function relName(rel: { name: string } | { name: string }[] | null | undefined): string | null {
  if (!rel) return null;
  const row = Array.isArray(rel) ? rel[0] : rel;
  return row?.name ?? null;
}

export async function resolveBreakfastBranchId(slug: string): Promise<number | null> {
  const supabase = getBreakfastSupabase();
  const { data, error } = await supabase
    .from("branches")
    .select("id")
    .eq("slug", slug.trim().toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id ?? null;
}

/** Paginated fetch — all rows, stable order by id. */
export async function fetchAllOrders(
  supabase: Parameters<typeof fetchAllBreakfastOrders>[0],
  branchId: number,
  filter: { pickup_date?: string; pickup_gte?: string; pickup_lte?: string },
): Promise<RawOrder[]> {
  return fetchAllBreakfastOrders<RawOrder>(
    supabase,
    branchId,
    "id, branch_id, order_number, customer_name, pickup_date, status, source, total_amount, created_at, delivered_at, paid_at",
    filter,
  );
}

async function attachItemsSummary(
  supabase: SupabaseClient,
  orders: RawOrder[],
): Promise<BranchBreakfastOrder[]> {
  if (!orders.length) return [];

  const itemMap = new Map<number, { parts: string[]; count: number }>();
  const ids = orders.map((o) => o.id);

  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await supabase
      .from("order_items")
      .select("order_id, quantity, products(name), menus(name)")
      .in("order_id", chunk)
      .gt("quantity", 0);
    if (error) throw new Error(error.message);

    for (const row of (data ?? []) as RawItem[]) {
      const name = relName(row.products) ?? relName(row.menus) ?? "Artikel";
      const qty = toNum(row.quantity);
      const cur = itemMap.get(row.order_id) ?? { parts: [], count: 0 };
      cur.parts.push(`${qty}× ${name}`);
      cur.count += qty;
      itemMap.set(row.order_id, cur);
    }
  }

  return orders.map((o) => {
    const items = itemMap.get(o.id);
    return {
      id: o.id,
      order_number: o.order_number,
      customer_name: o.customer_name,
      pickup_date: o.pickup_date,
      status: o.status,
      source: o.source,
      total_amount: toNum(o.total_amount),
      created_at: o.created_at,
      delivered_at: o.delivered_at,
      paid_at: o.paid_at,
      items_summary: items?.parts.join(", ") ?? "—",
      item_count: items?.count ?? 0,
    };
  });
}

function summarize(orders: BranchBreakfastOrder[]): BranchBreakfastSummary {
  let revenue = 0;
  let pending = 0;
  let delivered = 0;
  let notPicked = 0;
  let qr = 0;
  let staff = 0;

  for (const o of orders) {
    revenue += o.total_amount;
    if (o.status === "pending") pending++;
    else if (o.status === "delivered") delivered++;
    else if (o.status === "not_picked_up") notPicked++;
    if (o.source === "qr") qr++;
    if (o.source === "staff") staff++;
  }

  return {
    total_orders: orders.length,
    revenue: Math.round(revenue * 100) / 100,
    pending_count: pending,
    delivered_count: delivered,
    not_picked_up_count: notPicked,
    staff_today_count: 0,
    staff_today_revenue: 0,
    qr_count: qr,
    staff_count: staff,
  };
}

function aggregateByDay(orders: RawOrder[]): Map<string, { orders: number; revenue: number }> {
  const map = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const d = o.pickup_date;
    const cur = map.get(d) ?? { orders: 0, revenue: 0 };
    map.set(d, { orders: cur.orders + 1, revenue: cur.revenue + toNum(o.total_amount) });
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

export async function loadBranchOrdersDashboard(input: {
  branchSlug: string;
  pickupDate: string | null;
  compare: ComparisonMode | null;
}): Promise<{
  breakfast_branch_id: number;
  today_ymd: string;
  default_pickup_date: string;
  pickup_date: string;
  orders: BranchBreakfastOrder[];
  unreceived: BranchBreakfastOrder[];
  floor_today: BranchBreakfastOrder[];
  summary: BranchBreakfastSummary;
  comparison: BranchBreakfastComparison | null;
}> {
  const supabase = getBreakfastSupabase();
  const branchId = await resolveBreakfastBranchId(input.branchSlug);
  if (!branchId) throw new Error("Frühstücks-Filiale nicht gefunden");

  const today = berlinTodayYmd();
  const defaultPickup = addBerlinDays(today, 1);
  const pickupDate = input.pickupDate?.trim() || defaultPickup;

  const [rawForDate, rawFloorToday] = await Promise.all([
    fetchAllOrders(supabase, branchId, { pickup_date: pickupDate }),
    fetchAllOrders(supabase, branchId, { pickup_date: today }),
  ]);

  const [orders, floorRaw] = await Promise.all([
    attachItemsSummary(supabase, rawForDate),
    attachItemsSummary(
      supabase,
      rawFloorToday.filter((o) => o.source === "staff"),
    ),
  ]);

  const unreceived = orders.filter((o) => o.status === "pending");
  const summary = summarize(orders);
  summary.staff_today_count = floorRaw.length;
  summary.staff_today_revenue = Math.round(floorRaw.reduce((s, o) => s + o.total_amount, 0) * 100) / 100;

  let comparison: BranchBreakfastComparison | null = null;
  if (input.compare) {
    const { current, previous } = comparisonWindows(pickupDate, input.compare);
    const [curRaw, prevRaw] = await Promise.all([
      fetchAllOrders(supabase, branchId, {
        pickup_gte: current.startYmd,
        pickup_lte: current.endYmd,
      }),
      fetchAllOrders(supabase, branchId, {
        pickup_gte: previous.startYmd,
        pickup_lte: previous.endYmd,
      }),
    ]);

    const curOrders = curRaw.length;
    const prevOrders = prevRaw.length;
    const curRev = Math.round(curRaw.reduce((s, o) => s + toNum(o.total_amount), 0) * 100) / 100;
    const prevRev = Math.round(prevRaw.reduce((s, o) => s + toNum(o.total_amount), 0) * 100) / 100;

    comparison = {
      mode: input.compare,
      label: `${current.label} vs. ${previous.label}`,
      current: { start: current.startYmd, end: current.endYmd, orders: curOrders, revenue: curRev },
      previous: { start: previous.startYmd, end: previous.endYmd, orders: prevOrders, revenue: prevRev },
      orders_pct: pctChange(curOrders, prevOrders),
      revenue_pct: pctChange(curRev, prevRev),
      chart: buildComparisonChart(aggregateByDay(curRaw), aggregateByDay(prevRaw), input.compare),
    };
  }

  return {
    breakfast_branch_id: branchId,
    today_ymd: today,
    default_pickup_date: defaultPickup,
    pickup_date: pickupDate,
    orders,
    unreceived,
    floor_today: floorRaw,
    summary,
    comparison,
  };
}
