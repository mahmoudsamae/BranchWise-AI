import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { parseOpsColumns } from "@/lib/branch-ops/columns";
import type { Database } from "@/lib/database.types";
import { createServiceRoleClient } from "@/lib/supabase";
import { asJson } from "@/lib/supabase-json";

type Params = { params: Promise<{ id: string }> };
type TableUpdate = Database["public"]["Tables"]["branch_ops_tables"]["Update"];

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: { name?: string; columns?: unknown; sort_order?: number; is_active?: boolean; daily_items?: { id?: string; label: string; time_hint?: string }[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: TableUpdate = { updated_at: new Date().toISOString() };
  if (body.name !== undefined) patch.name = String(body.name).trim();
  if (body.sort_order !== undefined) patch.sort_order = body.sort_order;
  if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);
  if (body.columns !== undefined) {
    const parsed = parseOpsColumns(body.columns);
    if (!parsed.success) return NextResponse.json({ error: "Invalid columns" }, { status: 400 });
    patch.columns = parsed.data;
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("branch_ops_tables")
      .update(patch)
      .eq("id", id)
      .eq("branch_id", auth.session.branch_id)
      .select("id, name, table_type, columns, sort_order, is_active")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Table not found" }, { status: 404 });

    if (data.table_type === "daily" && Array.isArray(body.daily_items)) {
      await supabase.from("branch_ops_daily_items").delete().eq("table_id", id);
      const items = body.daily_items
        .map((item, i) => ({
          table_id: id,
          label: String(item.label).trim(),
          time_hint: item.time_hint ? String(item.time_hint).trim() : null,
          sort_order: i,
        }))
        .filter((item) => item.label);
      if (items.length > 0) await supabase.from("branch_ops_daily_items").insert(items);
    }

    return NextResponse.json({ table: data });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("branch_ops_tables")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("branch_id", auth.session.branch_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ deactivated: true });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
