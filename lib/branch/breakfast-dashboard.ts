import { isBreakfastSupabaseConfigured } from "@/lib/breakfast-supabase";
import { addBerlinDays, berlinTodayYmd } from "@/lib/fruhstuck/berlin-range";
import { fetchAllOrders, resolveBreakfastBranchId } from "@/lib/fruhstuck/branch-orders-query";
import { getBreakfastSupabase } from "@/lib/breakfast-supabase";
import { createServiceRoleClient } from "@/lib/supabase";

export type BranchBreakfastDashboardSummary = {
  linked: boolean;
  tomorrowYmd: string;
  tomorrowLabel: string;
  itemCount: number;
  orderCount: number;
  highVolume: boolean;
  hint: string | null;
};

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatTomorrowLabel(ymd: string): string {
  try {
    const d = new Date(`${ymd}T12:00:00`);
    const weekday = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "Europe/Berlin" })
      .format(d)
      .replace(".", "")
      .toUpperCase();
    const day = new Intl.DateTimeFormat("de-DE", { day: "numeric", timeZone: "Europe/Berlin" }).format(d);
    const month = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "Europe/Berlin" })
      .format(d)
      .replace(".", "")
      .toUpperCase();
    return `${weekday} ${day} ${month}`;
  } catch {
    return ymd;
  }
}

async function sumItemQuantities(orderIds: number[]): Promise<number> {
  if (!orderIds.length) return 0;
  const supabase = getBreakfastSupabase();
  let total = 0;
  for (let i = 0; i < orderIds.length; i += 200) {
    const chunk = orderIds.slice(i, i + 200);
    const { data, error } = await supabase
      .from("order_items")
      .select("quantity")
      .in("order_id", chunk)
      .gt("quantity", 0);
    if (error) throw new Error(error.message);
    for (const row of data ?? []) total += toNum(row.quantity);
  }
  return total;
}

async function averageDailyItems(branchBreakfastId: number, beforeYmd: string, days: number): Promise<number> {
  const supabase = getBreakfastSupabase();
  const start = addBerlinDays(beforeYmd, -days);
  const orders = await fetchAllOrders(supabase, branchBreakfastId, {
    pickup_gte: start,
    pickup_lte: addBerlinDays(beforeYmd, -1),
  });
  if (!orders.length) return 0;
  const ids = orders.map((o) => o.id);
  const items = await sumItemQuantities(ids);
  const uniqueDays = new Set(orders.map((o) => o.pickup_date)).size;
  return uniqueDays > 0 ? items / uniqueDays : 0;
}

export async function getBranchBreakfastDashboardSummary(branchId: string): Promise<BranchBreakfastDashboardSummary> {
  const tomorrow = addBerlinDays(berlinTodayYmd(), 1);
  const empty: BranchBreakfastDashboardSummary = {
    linked: false,
    tomorrowYmd: tomorrow,
    tomorrowLabel: formatTomorrowLabel(tomorrow),
    itemCount: 0,
    orderCount: 0,
    highVolume: false,
    hint: null,
  };

  if (!isBreakfastSupabaseConfigured()) return empty;

  const supabase = createServiceRoleClient();
  const { data: branch } = await supabase
    .from("branches")
    .select("external_id")
    .eq("id", branchId)
    .maybeSingle();

  const slug = branch?.external_id?.trim();
  if (!slug) return empty;

  try {
    const breakfastBranchId = await resolveBreakfastBranchId(slug);
    if (!breakfastBranchId) return empty;

    const breakfastSupabase = getBreakfastSupabase();
    const tomorrowOrders = await fetchAllOrders(breakfastSupabase, breakfastBranchId, { pickup_date: tomorrow });
    const itemCount = await sumItemQuantities(tomorrowOrders.map((o) => o.id));
    const avg = await averageDailyItems(breakfastBranchId, tomorrow, 14);
    const highVolume = avg > 0 && itemCount > avg * 1.15 && itemCount >= 40;

    return {
      linked: true,
      tomorrowYmd: tomorrow,
      tomorrowLabel: formatTomorrowLabel(tomorrow),
      itemCount,
      orderCount: tomorrowOrders.length,
      highVolume,
      hint: highVolume ? "Hohes Aufkommen — früher anfangen, Aushilfe einplanen." : null,
    };
  } catch {
    return empty;
  }
}
