import type { SupabaseClient } from "@supabase/supabase-js";

import { isOpsTimeGroup, type OpsTimeGroup } from "@/lib/branch-ops/time-groups";

export type DailyItemInput = {
  id?: string;
  label: string;
  time_hint?: string | null;
  time_group?: OpsTimeGroup;
};

export async function syncDailyItems(
  supabase: SupabaseClient,
  tableId: string,
  items: DailyItemInput[],
): Promise<{ error?: string }> {
  const cleaned = items
    .map((item, i) => ({
      id: item.id?.trim() || undefined,
      label: String(item.label).trim(),
      time_hint: item.time_hint ? String(item.time_hint).trim() : null,
      time_group: item.time_group && isOpsTimeGroup(item.time_group) ? item.time_group : ("morning" as OpsTimeGroup),
      sort_order: i,
    }))
    .filter((item) => item.label);

  const { data: existing, error: loadErr } = await supabase
    .from("branch_ops_daily_items")
    .select("id")
    .eq("table_id", tableId);

  if (loadErr) return { error: loadErr.message };

  const incomingIds = new Set(cleaned.map((i) => i.id).filter(Boolean) as string[]);
  const toDeactivate = (existing ?? []).filter((row) => !incomingIds.has(row.id as string)).map((row) => row.id as string);

  if (toDeactivate.length > 0) {
    const { error } = await supabase.from("branch_ops_daily_items").update({ is_active: false }).in("id", toDeactivate);
    if (error) return { error: error.message };
  }

  for (const item of cleaned) {
    if (item.id) {
      const { error } = await supabase
        .from("branch_ops_daily_items")
        .update({
          label: item.label,
          time_hint: item.time_hint,
          time_group: item.time_group,
          sort_order: item.sort_order,
          is_active: true,
        })
        .eq("id", item.id)
        .eq("table_id", tableId);
      if (error) return { error: error.message };
    } else {
      const { error } = await supabase.from("branch_ops_daily_items").insert({
        table_id: tableId,
        label: item.label,
        time_hint: item.time_hint,
        time_group: item.time_group,
        sort_order: item.sort_order,
        is_active: true,
      });
      if (error) return { error: error.message };
    }
  }

  return {};
}
