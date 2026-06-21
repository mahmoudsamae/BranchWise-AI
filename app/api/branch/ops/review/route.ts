import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { fetchDailyItemsForDate } from "@/lib/branch-ops/fetch-daily-for-date";
import { filterOpenLogRows, purgeExpiredReturnedRows } from "@/lib/branch-ops/log-rows";
import { todayWorkDate } from "@/lib/branch-ops/resolve-token";
import type { OpsColumn } from "@/lib/branch-ops/columns";
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
        const columns = (table.columns ?? []) as OpsColumn[];
        const { data: rows } = await supabase
          .from("branch_ops_rows")
          .select("id, data, staff_member_id, created_at")
          .eq("table_id", table.id)
          .eq("work_date", workDate)
          .order("created_at", { ascending: false });

        const rawRows = (rows ?? []).map((r) => ({
          id: r.id,
          data: r.data as Record<string, unknown>,
          created_at: r.created_at,
          staff_member_id: r.staff_member_id,
        }));

        await purgeExpiredReturnedRows(supabase, table.id, columns, rawRows);
        const visible = filterOpenLogRows(rawRows, columns);

        result.push({
          ...table,
          rows: visible.map((r) => ({
            id: r.id,
            data: r.data,
            staff_name: r.staff_member_id ? staffMap.get(r.staff_member_id) ?? null : null,
            created_at: r.created_at,
          })),
        });
      } else {
        const items = await fetchDailyItemsForDate(supabase, table.id, workDate, staffMap);
        result.push({ ...table, items });
      }
    }

    return NextResponse.json({ work_date: workDate, tables: result });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
