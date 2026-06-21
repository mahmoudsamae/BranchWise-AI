import { NextResponse } from "next/server";

import { validateOpsRowData, type OpsColumn } from "@/lib/branch-ops/columns";
import { mergeReturnPatch } from "@/lib/branch-ops/log-rows";
import { resolveBranchOpsToken, todayWorkDate } from "@/lib/branch-ops/resolve-token";
import { createServiceRoleClient } from "@/lib/supabase";
import { asJson } from "@/lib/supabase-json";

type Params = { params: Promise<{ token: string; tableId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token, tableId } = await params;
  const resolved = await resolveBranchOpsToken(token);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let body: { data?: Record<string, unknown>; staff_member_id?: string; work_date?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: table, error: tableError } = await supabase
      .from("branch_ops_tables")
      .select("id, table_type, columns, is_active")
      .eq("id", tableId)
      .eq("branch_id", resolved.branch_id)
      .maybeSingle();

    if (tableError) return NextResponse.json({ error: tableError.message }, { status: 500 });
    if (!table || !table.is_active || table.table_type !== "log") {
      return NextResponse.json({ error: "Log table not found" }, { status: 404 });
    }

    const columns = (table.columns ?? []) as OpsColumn[];
    const validated = validateOpsRowData(columns, body.data ?? {});
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

    let staffMemberId = String(body.staff_member_id ?? "").trim() || null;
    const staffCol = columns.find((c) => c.type === "staff");
    if (!staffMemberId && staffCol && validated.data[staffCol.id]) {
      staffMemberId = String(validated.data[staffCol.id]);
    }

    const workDate = body.work_date?.trim() || todayWorkDate();

    const { data: row, error } = await supabase
      .from("branch_ops_rows")
      .insert({
        table_id: tableId,
        branch_id: resolved.branch_id,
        work_date: workDate,
        data: asJson(validated.data),
        staff_member_id: staffMemberId,
      })
      .select("id, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ row });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { token, tableId } = await params;
  const resolved = await resolveBranchOpsToken(token);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let body: { row_id?: string; data?: Record<string, unknown> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rowId = String(body.row_id ?? "").trim();
  if (!rowId) return NextResponse.json({ error: "row_id required" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const { data: table } = await supabase
      .from("branch_ops_tables")
      .select("columns")
      .eq("id", tableId)
      .eq("branch_id", resolved.branch_id)
      .maybeSingle();

    if (!table) return NextResponse.json({ error: "Table not found" }, { status: 404 });

    const columns = (table.columns ?? []) as OpsColumn[];
    const existing = await supabase
      .from("branch_ops_rows")
      .select("data")
      .eq("id", rowId)
      .eq("table_id", tableId)
      .maybeSingle();

    if (!existing.data) return NextResponse.json({ error: "Row not found" }, { status: 404 });

    const merged = mergeReturnPatch(
      existing.data.data as Record<string, unknown>,
      body.data ?? {},
      columns,
    );
    const validated = validateOpsRowData(columns, merged);
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

    const { error } = await supabase
      .from("branch_ops_rows")
      .update({ data: asJson(validated.data) })
      .eq("id", rowId)
      .eq("table_id", tableId);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ updated: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
