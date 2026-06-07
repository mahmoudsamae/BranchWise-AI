import { NextResponse } from "next/server";

import { requireGeneralManagerApi } from "@/lib/gm-hr/require-session";
import type { BreakfastAnalyticsData } from "@/lib/fruhstuck/types";
import { createServiceRoleClient } from "@/lib/supabase";

type RouteCtx = { params: Promise<{ branchId: string }> };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request, ctx: RouteCtx) {
  const auth = await requireGeneralManagerApi();
  if (!auth.ok) return auth.response;

  const { branchId } = await ctx.params;
  const date = new URL(request.url).searchParams.get("date")?.slice(0, 10) ?? todayIso();

  try {
    const supabase = createServiceRoleClient();

    const [{ data: branch }, { data: row, error }] = await Promise.all([
      supabase.from("branches").select("id, name, external_id").eq("id", branchId).maybeSingle(),
      supabase
        .from("fruhstuck_data")
        .select("orders_count, revenue, top_item, items, raw_data, synced_at")
        .eq("branch_id", branchId)
        .eq("date", date)
        .maybeSingle(),
    ]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!row) return NextResponse.json({ error: "No data for this date" }, { status: 404 });

    const raw = (row.raw_data ?? {}) as BreakfastAnalyticsData;
    const items = raw.products?.topProducts ?? (Array.isArray(row.items) ? row.items : []);

    return NextResponse.json({
      branch_id: branchId,
      branch_name: branch?.name ?? "Unknown",
      external_id: branch?.external_id ?? null,
      date,
      orders_count: row.orders_count,
      revenue: Number(row.revenue),
      top_item: row.top_item,
      synced_at: row.synced_at,
      items,
      products_breakdown: raw.products?.productsBreakdown ?? [],
      orders_by_hour: raw.timeAnalytics?.ordersByHour ?? [],
      registration: raw.registration ?? null,
      comparisons: raw.comparisons ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
