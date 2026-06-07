import { NextResponse } from "next/server";

import { resolveBranchOpsToken, todayWorkDate } from "@/lib/branch-ops/resolve-token";
import { createServiceRoleClient } from "@/lib/supabase";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;
  const resolved = await resolveBranchOpsToken(token);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const url = new URL(request.url);
  const workDate = url.searchParams.get("date")?.trim() || todayWorkDate();

  try {
    const supabase = createServiceRoleClient();

    const [tablesRes, staffRes] = await Promise.all([
      supabase
        .from("branch_ops_tables")
        .select("id, name, table_type, columns, sort_order")
        .eq("branch_id", resolved.branch_id)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("staff_members")
        .select("id, full_name")
        .eq("branch_id", resolved.branch_id)
        .eq("is_active", true)
        .order("full_name"),
    ]);

    if (tablesRes.error) return NextResponse.json({ error: tablesRes.error.message }, { status: 500 });

    const tables = [];
    for (const table of tablesRes.data ?? []) {
      if (table.table_type === "daily") {
        const { data: items } = await supabase
          .from("branch_ops_daily_items")
          .select("id, label, time_hint, sort_order")
          .eq("table_id", table.id)
          .eq("is_active", true)
          .order("sort_order");

        const itemIds = (items ?? []).map((i) => i.id);
        const { data: completions } =
          itemIds.length > 0
            ? await supabase
                .from("branch_ops_daily_completions")
                .select("daily_item_id, staff_member_id, completed_at")
                .in("daily_item_id", itemIds)
                .eq("work_date", workDate)
            : { data: [] };

        const staffMap = new Map((staffRes.data ?? []).map((s) => [s.id, s.full_name]));
        const completionMap = new Map((completions ?? []).map((c) => [c.daily_item_id, c]));

        tables.push({
          ...table,
          items: (items ?? []).map((item) => {
            const c = completionMap.get(item.id);
            return {
              ...item,
              completed: Boolean(c),
              staff_member_id: c?.staff_member_id ?? null,
              staff_name: c?.staff_member_id ? staffMap.get(c.staff_member_id) ?? null : null,
              completed_at: c?.completed_at ?? null,
            };
          }),
        });
      } else {
        const { data: rows } = await supabase
          .from("branch_ops_rows")
          .select("id, data, staff_member_id, created_at")
          .eq("table_id", table.id)
          .eq("work_date", workDate)
          .order("created_at", { ascending: false });

        const staffMap = new Map((staffRes.data ?? []).map((s) => [s.id, s.full_name]));
        tables.push({
          ...table,
          rows: (rows ?? []).map((r) => ({
            id: r.id,
            data: r.data,
            staff_member_id: r.staff_member_id,
            staff_name: r.staff_member_id ? staffMap.get(r.staff_member_id) ?? null : null,
            created_at: r.created_at,
          })),
        });
      }
    }

    return NextResponse.json({
      branch_name: resolved.branch_name,
      work_date: workDate,
      staff: staffRes.data ?? [],
      tables,
    });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
