import type { SupabaseClient } from "@supabase/supabase-js";

import { isOpsTimeGroup, type OpsTimeGroup } from "@/lib/branch-ops/time-groups";

export type DailyItemWithCompletion = {
  id: string;
  label: string;
  time_hint: string | null;
  time_group: OpsTimeGroup;
  sort_order: number;
  is_active: boolean;
  completed: boolean;
  staff_member_id: string | null;
  staff_name: string | null;
  completed_at: string | null;
};

export async function fetchDailyItemsForDate(
  supabase: SupabaseClient,
  tableId: string,
  workDate: string,
  staffMap: Map<string, string>,
): Promise<DailyItemWithCompletion[]> {
  const { data: tableItems, error: itemsErr } = await supabase
    .from("branch_ops_daily_items")
    .select("id, label, time_hint, time_group, sort_order, is_active")
    .eq("table_id", tableId)
    .order("sort_order");

  if (itemsErr) throw new Error(itemsErr.message);

  const itemIds = (tableItems ?? []).map((i) => i.id as string);
  const completionMap = new Map<string, { staff_member_id: string | null; completed_at: string | null }>();

  if (itemIds.length > 0) {
    const { data: completions, error: compErr } = await supabase
      .from("branch_ops_daily_completions")
      .select("daily_item_id, staff_member_id, completed_at")
      .in("daily_item_id", itemIds)
      .eq("work_date", workDate);

    if (compErr) throw new Error(compErr.message);

    for (const c of completions ?? []) {
      completionMap.set(c.daily_item_id as string, {
        staff_member_id: (c.staff_member_id as string | null) ?? null,
        completed_at: (c.completed_at as string | null) ?? null,
      });
    }
  }

  const activeItems = (tableItems ?? []).filter((i) => i.is_active);
  const historicalItems = (tableItems ?? []).filter((i) => !i.is_active && completionMap.has(i.id as string));

  const merged = [...activeItems, ...historicalItems].sort(
    (a, b) => (a.sort_order as number) - (b.sort_order as number),
  );

  return merged.map((item) => {
    const c = completionMap.get(item.id as string);
    const groupRaw = String(item.time_group ?? "morning");
    return {
      id: item.id as string,
      label: String(item.label),
      time_hint: (item.time_hint as string | null) ?? null,
      time_group: isOpsTimeGroup(groupRaw) ? groupRaw : "morning",
      sort_order: item.sort_order as number,
      is_active: Boolean(item.is_active),
      completed: Boolean(c),
      staff_member_id: c?.staff_member_id ?? null,
      staff_name: c?.staff_member_id ? staffMap.get(c.staff_member_id) ?? null : null,
      completed_at: c?.completed_at ?? null,
    };
  });
}
