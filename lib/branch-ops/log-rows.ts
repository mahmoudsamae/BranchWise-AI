import type { SupabaseClient } from "@supabase/supabase-js";

import type { OpsColumn } from "@/lib/branch-ops/columns";

export const OPS_RETURNED_AT_KEY = "_returned_at";

const ONE_DAY_MS = 86_400_000;

export type OpsLogRowRecord = {
  id: string;
  data: Record<string, unknown>;
  created_at: string;
};

/** Optional boolean column used as „zurück / erhalten“ flag (Verleih tables). */
export function findReturnColumn(columns: OpsColumn[]): OpsColumn | null {
  const optionalBoolean = columns.filter((c) => c.type === "boolean" && !c.required);
  if (optionalBoolean.length === 1) return optionalBoolean[0]!;

  const byLabel = columns.find(
    (c) =>
      c.type === "boolean" &&
      /zurück|zurueck|return|erhalten|zurückgegeben|returned/i.test(c.label),
  );
  if (byLabel) return byLabel;

  return optionalBoolean[0] ?? null;
}

export function isRowReturned(data: Record<string, unknown>, returnCol: OpsColumn | null): boolean {
  if (!returnCol) return false;
  const raw = data[returnCol.id];
  return raw === true || raw === "true" || raw === 1 || raw === "1";
}

/** Only open (not yet returned) Verleih rows — returned items disappear from the list. */
export function filterOpenLogRows<T extends OpsLogRowRecord>(rows: T[], columns: OpsColumn[]): T[] {
  const returnCol = findReturnColumn(columns);
  if (!returnCol) return rows;
  return rows.filter((r) => !isRowReturned(r.data, returnCol));
}

export function mergeReturnPatch(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
  columns: OpsColumn[],
): Record<string, unknown> {
  const merged = { ...existing, ...patch };
  const returnCol = findReturnColumn(columns);
  if (!returnCol || !(returnCol.id in patch)) return merged;

  const nowReturned = isRowReturned(merged, returnCol);
  const wasReturned = isRowReturned(existing, returnCol);

  if (nowReturned && !wasReturned) {
    merged[OPS_RETURNED_AT_KEY] = new Date().toISOString();
  } else if (!nowReturned) {
    delete merged[OPS_RETURNED_AT_KEY];
  }

  return merged;
}

/** Delete returned rows older than 24h (background cleanup on load). */
export async function purgeExpiredReturnedRows(
  supabase: SupabaseClient,
  tableId: string,
  columns: OpsColumn[],
  rows: OpsLogRowRecord[],
): Promise<void> {
  const returnCol = findReturnColumn(columns);
  if (!returnCol || rows.length === 0) return;

  const now = Date.now();
  const expiredIds: string[] = [];

  for (const row of rows) {
    if (!isRowReturned(row.data, returnCol)) continue;
    const returnedAt = row.data[OPS_RETURNED_AT_KEY];
    if (typeof returnedAt !== "string" || !returnedAt) {
      // Legacy row marked returned without timestamp — purge after 24h from created_at
      const age = now - Date.parse(row.created_at);
      if (age >= ONE_DAY_MS) expiredIds.push(row.id);
      continue;
    }
    if (now - Date.parse(returnedAt) >= ONE_DAY_MS) {
      expiredIds.push(row.id);
    }
  }

  if (expiredIds.length === 0) return;
  await supabase.from("branch_ops_rows").delete().in("id", expiredIds);
}
