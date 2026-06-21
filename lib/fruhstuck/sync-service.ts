import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchBreakfastAnalytics, mapAnalyticsToPayload } from "./client";
import type { BreakfastRange } from "./types";

export type SyncResult = {
  synced: number;
  errors: { branch_id: string; branch_name: string; message: string }[];
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function syncFruhstuckData(
  supabase: SupabaseClient,
  range: BreakfastRange = "today",
  branchId?: string,
): Promise<SyncResult> {
  let query = supabase
    .from("branches")
    .select("id, name, external_id")
    .eq("is_active", true)
    .not("external_id", "is", null)
    .order("name");

  if (branchId) query = query.eq("id", branchId);

  const { data: branches, error } = await query;
  if (error) {
    console.error("[fruhstuck/sync] branches query failed:", error);
    throw new Error(error.message);
  }

  const list = (branches ?? []).filter((b) => String(b.external_id ?? "").trim());
  let synced = 0;
  const errors: SyncResult["errors"] = [];
  const storeDate = todayIso();

  for (const branch of list) {
    const bid = branch.id as string;
    const bname = branch.name as string;
    const slug = String(branch.external_id).trim();

    const { data: apiData, error: fetchErr } = await fetchBreakfastAnalytics(slug, range);
    if (fetchErr || !apiData) {
      errors.push({ branch_id: bid, branch_name: bname, message: fetchErr ?? "No data" });
      continue;
    }

    const mapped = mapAnalyticsToPayload({ id: bid, name: bname, external_id: slug }, apiData);
    const topItem = mapped.top_product;

    const { error: upsertErr } = await supabase.from("fruhstuck_data").upsert(
      {
        branch_id: bid,
        date: storeDate,
        orders_count: mapped.orders_count,
        top_item: topItem,
        items: mapped.items,
        raw_data: mapped.raw_data,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "branch_id,date" },
    );

    if (upsertErr) {
      console.error("[fruhstuck/sync] upsert failed:", bid, upsertErr);
      errors.push({ branch_id: bid, branch_name: bname, message: upsertErr.message });
      continue;
    }

    synced += 1;
  }

  return { synced, errors };
}
