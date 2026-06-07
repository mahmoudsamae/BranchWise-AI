import { NextResponse } from "next/server";

import { aggregateToRawData, queryBreakfastBranchData } from "@/lib/fruhstuck/db-query";
import { resolveBreakfastRange } from "@/lib/fruhstuck/range-params";
import { requireGeneralManagerApi } from "@/lib/gm-hr/require-session";
import type { FruhstuckBranchPayload } from "@/lib/fruhstuck/types";
import { isBreakfastSupabaseConfigured } from "@/lib/breakfast-supabase";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function mapToPayload(
  branch: { id: string; name: string; external_id: string },
  agg: Awaited<ReturnType<typeof queryBreakfastBranchData>>,
): FruhstuckBranchPayload {
  return {
    branch_id: branch.id,
    branch_name: branch.name,
    external_id: branch.external_id,
    orders_count: agg.orders_count,
    revenue: agg.revenue,
    top_product: agg.top_products[0]?.name ?? null,
    trend_pct: null,
    items: agg.top_products.slice(0, 10).map((p) => ({ name: p.name, count: p.count })),
    raw_data: aggregateToRawData(agg),
    synced_at: null,
  };
}

export async function GET(request: Request) {
  const auth = await requireGeneralManagerApi();
  if (!auth.ok) return auth.response;

  if (!isBreakfastSupabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "Breakfast Supabase not configured. Set BREAKFAST_SUPABASE_URL and BREAKFAST_SUPABASE_SERVICE_ROLE_KEY in .env.local",
      },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const resolved = resolveBreakfastRange(
    url.searchParams.get("range"),
    url.searchParams.get("start_date"),
    url.searchParams.get("end_date"),
  );

  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }

  const branchSlugParam = url.searchParams.get("branch_slug")?.trim().toLowerCase();
  const branchIdParam = url.searchParams.get("branch_id");

  try {
    const supabase = createServiceRoleClient();

    let bwQuery = supabase
      .from("branches")
      .select("id, name, external_id")
      .eq("is_active", true)
      .not("external_id", "is", null)
      .order("name");

    if (branchSlugParam) {
      bwQuery = bwQuery.eq("external_id", branchSlugParam);
    } else if (branchIdParam && branchIdParam !== "all") {
      bwQuery = bwQuery.eq("id", branchIdParam);
    }

    const { data: bwBranches, error: bwErr } = await bwQuery;
    if (bwErr) {
      console.error("[GET /api/fruhstuck/data] branches error:", bwErr);
      return NextResponse.json({ error: bwErr.message }, { status: 500 });
    }

    const targets = (bwBranches ?? []).filter((b) => String(b.external_id ?? "").trim());
    if (targets.length === 0) {
      return NextResponse.json({
        range: resolved.label,
        range_kind: resolved.kind,
        start_date: resolved.startYmd,
        end_date: resolved.endYmd,
        source: "breakfast_supabase",
        branches: [],
        warning: "No branches with external_id (slug). Set slugs under Branches → detail.",
      });
    }

    const window = { startYmd: resolved.startYmd, endYmd: resolved.endYmd };
    const branches: FruhstuckBranchPayload[] = [];
    const errors: { branch_id: string; branch_name: string; message: string }[] = [];

    for (const b of targets) {
      const slug = String(b.external_id).trim().toLowerCase();
      try {
        const agg = await queryBreakfastBranchData(slug, window);
        branches.push(mapToPayload({ id: b.id, name: b.name, external_id: slug }, agg));
      } catch (e) {
        console.error("[GET /api/fruhstuck/data] query failed:", slug, e);
        errors.push({
          branch_id: b.id,
          branch_name: b.name,
          message: e instanceof Error ? e.message : "Query failed",
        });
      }
    }

    const meta = {
      range: resolved.label,
      range_kind: resolved.kind,
      start_date: resolved.startYmd,
      end_date: resolved.endYmd,
      source: "breakfast_supabase" as const,
    };

    if (branchSlugParam && branches.length === 1 && branches[0]) {
      const b = branches[0];
      return NextResponse.json({
        ...meta,
        branch_slug: branchSlugParam,
        orders_count: b.orders_count,
        revenue: b.revenue,
        items_sold: b.raw_data.summary.itemsSold,
        top_products: b.raw_data.products.productsBreakdown.map((p) => ({
          name: p.name,
          count: p.count,
          revenue: p.revenue,
        })),
        revenue_per_day: b.raw_data.revenue.revenuePerDay,
        orders_by_hour: b.raw_data.timeAnalytics.ordersByHour,
        branch: b,
        branches,
        errors,
      });
    }

    return NextResponse.json({ ...meta, branches, errors });
  } catch (e) {
    console.error("[GET /api/fruhstuck/data] error:", e);
    const msg = e instanceof Error ? e.message : "Database query failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
