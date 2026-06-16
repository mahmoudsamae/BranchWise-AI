import { todayWorkDate } from "@/lib/branch-ops/dates";
import { createServiceRoleClient } from "@/lib/supabase";

export type TodaysTaskProgress = {
  tableId: string;
  name: string;
  completed: number;
  total: number;
};

export async function getTodaysTaskProgress(branchId: string): Promise<TodaysTaskProgress[]> {
  const supabase = createServiceRoleClient();
  const workDate = todayWorkDate();

  const { data: tables } = await supabase
    .from("branch_ops_tables")
    .select("id, name, sort_order")
    .eq("branch_id", branchId)
    .eq("table_type", "daily")
    .eq("is_active", true)
    .order("sort_order");

  if (!tables || tables.length === 0) return [];

  const result: TodaysTaskProgress[] = [];
  for (const table of tables) {
    const { data: items } = await supabase
      .from("branch_ops_daily_items")
      .select("id")
      .eq("table_id", table.id)
      .eq("is_active", true);

    const itemIds = (items ?? []).map((i) => i.id);
    let completedCount = 0;
    if (itemIds.length > 0) {
      const { count } = await supabase
        .from("branch_ops_daily_completions")
        .select("*", { count: "exact", head: true })
        .in("daily_item_id", itemIds)
        .eq("work_date", workDate);
      completedCount = count ?? 0;
    }

    result.push({
      tableId: table.id,
      name: table.name,
      completed: completedCount,
      total: itemIds.length,
    });
  }

  return result;
}
