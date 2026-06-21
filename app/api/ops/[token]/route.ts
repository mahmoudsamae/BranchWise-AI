import { NextResponse } from "next/server";

import { fetchDailyItemsForDate } from "@/lib/branch-ops/fetch-daily-for-date";
import { filterOpenLogRows, purgeExpiredReturnedRows } from "@/lib/branch-ops/log-rows";
import { resolveBranchOpsToken, todayWorkDate } from "@/lib/branch-ops/resolve-token";
import type { OpsColumn } from "@/lib/branch-ops/columns";
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

    const staffMap = new Map((staffRes.data ?? []).map((s) => [s.id, s.full_name]));
    const tables = [];
    for (const table of tablesRes.data ?? []) {
      if (table.table_type === "daily") {
        const items = await fetchDailyItemsForDate(supabase, table.id, workDate, staffMap);
        tables.push({ ...table, items });
      } else {
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
          staff_member_id: r.staff_member_id,
          staff_name: r.staff_member_id ? staffMap.get(r.staff_member_id) ?? null : null,
          created_at: r.created_at,
        }));

        await purgeExpiredReturnedRows(supabase, table.id, columns, rawRows);

        const visible = filterOpenLogRows(rawRows, columns);

        tables.push({
          ...table,
          rows: visible.map(({ staff_member_id: _s, ...r }) => r),
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
