import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 1000;

export type BreakfastOrderFilter = {
  pickup_date?: string;
  pickup_gte?: string;
  pickup_lte?: string;
  created_gte?: string;
  created_lte?: string;
};

/** Stable offset pagination — always order by primary key. */
export async function paginateRows<T>(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export async function fetchAllBreakfastOrders<TRow>(
  supabase: SupabaseClient,
  branchId: number,
  select: string,
  filter: BreakfastOrderFilter,
): Promise<TRow[]> {
  return paginateRows<TRow>(async (from, to) => {
    let q = supabase
      .from("orders")
      .select(select)
      .eq("branch_id", branchId)
      .order("id", { ascending: true });

    if (filter.pickup_date) q = q.eq("pickup_date", filter.pickup_date);
    if (filter.pickup_gte) q = q.gte("pickup_date", filter.pickup_gte);
    if (filter.pickup_lte) q = q.lte("pickup_date", filter.pickup_lte);
    if (filter.created_gte) q = q.gte("created_at", filter.created_gte);
    if (filter.created_lte) q = q.lte("created_at", filter.created_lte);

    const result = await q.range(from, to);
    return {
      data: (result.data ?? []) as TRow[],
      error: result.error,
    };
  });
}

type ItemRow = {
  quantity: number;
  unit_price: number | string;
  order_id: number;
  products: { name: string; category?: string } | { name: string; category?: string }[] | null;
  menus: { name: string } | { name: string }[] | null;
};

/** Fetch all line items for many orders (paginated per chunk + per page). */
export async function fetchAllOrderItems(
  supabase: SupabaseClient,
  orderIds: Array<number | string>,
): Promise<ItemRow[]> {
  if (!orderIds.length) return [];

  const all: ItemRow[] = [];
  const chunkSize = 80;

  for (let i = 0; i < orderIds.length; i += chunkSize) {
    const chunk = orderIds.slice(i, i + chunkSize);
    const pages = await paginateRows<ItemRow>(async (from, to) => {
      const result = await supabase
        .from("order_items")
        .select("quantity, unit_price, order_id, products(name, category), menus(name)")
        .in("order_id", chunk)
        .gt("quantity", 0)
        .order("id", { ascending: true })
        .range(from, to);
      return { data: (result.data ?? []) as ItemRow[], error: result.error };
    });
    all.push(...pages);
  }

  return all;
}
