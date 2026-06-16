import { NextResponse } from "next/server";

import { isTodayWorkDate } from "@/lib/branch-ops/dates";
import { resolveBranchOpsToken, todayWorkDate } from "@/lib/branch-ops/resolve-token";
import { createServiceRoleClient } from "@/lib/supabase";

type Params = { params: Promise<{ token: string; tableId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token, tableId } = await params;
  const resolved = await resolveBranchOpsToken(token);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let body: { daily_item_id?: string; staff_member_id?: string; work_date?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dailyItemId = String(body.daily_item_id ?? "").trim();
  const staffMemberId = String(body.staff_member_id ?? "").trim();
  if (!dailyItemId) return NextResponse.json({ error: "daily_item_id required" }, { status: 400 });
  if (!staffMemberId) return NextResponse.json({ error: "staff_member_id required" }, { status: 400 });

  const workDate = body.work_date?.trim() || todayWorkDate();
  if (!isTodayWorkDate(workDate)) {
    return NextResponse.json({ error: "Nur der heutige Tag kann bearbeitet werden" }, { status: 403 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: table } = await supabase
      .from("branch_ops_tables")
      .select("id, table_type")
      .eq("id", tableId)
      .eq("branch_id", resolved.branch_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!table || table.table_type !== "daily") {
      return NextResponse.json({ error: "Daily table not found" }, { status: 404 });
    }

    const { data: item } = await supabase
      .from("branch_ops_daily_items")
      .select("id")
      .eq("id", dailyItemId)
      .eq("table_id", tableId)
      .maybeSingle();

    if (!item) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const { error } = await supabase.from("branch_ops_daily_completions").upsert(
      {
        daily_item_id: dailyItemId,
        work_date: workDate,
        staff_member_id: staffMemberId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "daily_item_id,work_date" },
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ completed: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
