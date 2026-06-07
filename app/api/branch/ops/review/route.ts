import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { todayWorkDate } from "@/lib/branch-ops/resolve-token";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const workDate = url.searchParams.get("date")?.trim() || todayWorkDate();

  try {
    const supabase = createServiceRoleClient();
    const branchId = auth.session.branch_id;

    const { data: tables } = await supabase
      .from("branch_ops_tables")
      .select("id, name, table_type, columns, is_active")
      .eq("branch_id", branchId)
      .eq("is_active", true);

    const { data: staff } = await supabase
      .from("staff_members")
      .select("id, full_name")
      .eq("branch_id", branchId)
      .eq("is_active", true);

    const staffMap = new Map((staff ?? []).map((s) => [s.id, s.full_name]));

    const result = [];
    for (const table of tables ?? []) {
      if (table.table_type === "log") {
        const { data: rows } = await supabase
          .from("branch_ops_rows")
          .select("id, data, staff_member_id, created_at")
          .eq("table_id", table.id)
          .eq("work_date", workDate)
          .order("created_at", { ascending: false });

        result.push({
          ...table,
          rows: (rows ?? []).map((r) => ({
            id: r.id,
            data: r.data,
            staff_name: r.staff_member_id ? staffMap.get(r.staff_member_id) ?? null : null,
            created_at: r.created_at,
          })),
        });
      } else {
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

        const completionMap = new Map((completions ?? []).map((c) => [c.daily_item_id, c]));

        result.push({
          ...table,
          items: (items ?? []).map((item) => {
            const c = completionMap.get(item.id);
            return {
              ...item,
              completed: Boolean(c),
              staff_name: c?.staff_member_id ? staffMap.get(c.staff_member_id) ?? null : null,
              completed_at: c?.completed_at ?? null,
            };
          }),
        });
      }
    }

    return NextResponse.json({ work_date: workDate, tables: result });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
