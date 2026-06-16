import { isBreakfastSupabaseConfigured } from "@/lib/breakfast-supabase";
import { createServiceRoleClient } from "@/lib/supabase";

import { loadBranchOperationsSnapshot, loadPeriodComparison } from "./branch-operations";
import type { BranchBreakfastComparison } from "./branch-order-types";
import { aggregateToRawData, queryBreakfastBranchData } from "./db-query";
import { addBerlinDays } from "./berlin-range";
import type { ComparisonMode } from "./comparison-windows";
import { resolveBreakfastRange } from "./range-params";
import type { BranchOperationsSnapshot } from "./branch-operations";
import type { FruhstuckBranchPayload } from "./types";

export type BranchBreakfastPayload = {
  branch: FruhstuckBranchPayload;
  range: string;
  range_kind: string;
  start_date: string;
  end_date: string;
  comparison: {
    orders_pct: number | null;
    revenue_pct: number | null;
    prev_orders: number;
    prev_revenue: number;
  };
  operations: BranchOperationsSnapshot;
  period_comparison: BranchBreakfastComparison | null;
};

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function shiftYmd(ymd: string, days: number): string {
  return addBerlinDays(ymd, days);
}

function parseCompare(v: string | null): ComparisonMode | null {
  const raw = (v ?? "").toLowerCase();
  if (raw === "wow" || raw === "mom" || raw === "yoy") return raw;
  return null;
}

export async function loadBranchBreakfastAnalytics(
  branchId: string,
  rangeParam: string | null,
  startParam: string | null,
  endParam: string | null,
  compareParam: string | null,
): Promise<
  | { ok: true; data: BranchBreakfastPayload }
  | { ok: false; status: number; error: string; code?: "not_configured" | "no_slug" | "not_found" }
> {
  if (!isBreakfastSupabaseConfigured()) {
    return {
      ok: false,
      status: 503,
      code: "not_configured",
      error: "Frühstück-Datenbank nicht konfiguriert. Bitte Admin kontaktieren.",
    };
  }

  const resolved = resolveBreakfastRange(rangeParam, startParam, endParam);
  if ("error" in resolved) {
    return { ok: false, status: 400, error: resolved.error };
  }

  const supabase = createServiceRoleClient();
  const { data: branch, error: branchErr } = await supabase
    .from("branches")
    .select("id, name, external_id")
    .eq("id", branchId)
    .eq("is_active", true)
    .maybeSingle();

  if (branchErr) return { ok: false, status: 500, error: branchErr.message };
  if (!branch) return { ok: false, status: 404, code: "not_found", error: "Filiale nicht gefunden" };

  const slug = String(branch.external_id ?? "").trim().toLowerCase();
  if (!slug) {
    return {
      ok: false,
      status: 400,
      code: "no_slug",
      error: "Kein Frühstück-Slug hinterlegt. Bitte den General Manager, external_id für diese Filiale zu setzen.",
    };
  }

  try {
    const window = { startYmd: resolved.startYmd, endYmd: resolved.endYmd };
    const days = Math.max(
      1,
      Math.round(
        (new Date(`${resolved.endYmd}T12:00:00`).getTime() -
          new Date(`${resolved.startYmd}T12:00:00`).getTime()) /
          86_400_000,
      ) + 1,
    );
    const prevEnd = shiftYmd(resolved.startYmd, -1);
    const prevStart = shiftYmd(resolved.startYmd, -days);
    const compareMode = parseCompare(compareParam);

    const [currentAgg, prevAgg, operations, periodComparison] = await Promise.all([
      queryBreakfastBranchData(slug, window),
      queryBreakfastBranchData(slug, { startYmd: prevStart, endYmd: prevEnd }),
      loadBranchOperationsSnapshot(slug),
      compareMode ? loadPeriodComparison(slug, resolved.endYmd, compareMode) : Promise.resolve(null),
    ]);

    const branchPayload: FruhstuckBranchPayload = {
      branch_id: branch.id,
      branch_name: branch.name,
      external_id: slug,
      orders_count: currentAgg.orders_count,
      revenue: currentAgg.revenue,
      top_product: currentAgg.top_products[0]?.name ?? null,
      trend_pct: pctChange(currentAgg.orders_count, prevAgg.orders_count),
      items: currentAgg.top_products.slice(0, 10).map((p) => ({ name: p.name, count: p.count })),
      raw_data: aggregateToRawData(currentAgg),
      synced_at: null,
    };

    return {
      ok: true,
      data: {
        branch: branchPayload,
        range: resolved.label,
        range_kind: resolved.kind,
        start_date: resolved.startYmd,
        end_date: resolved.endYmd,
        comparison: {
          orders_pct: pctChange(currentAgg.orders_count, prevAgg.orders_count),
          revenue_pct: pctChange(currentAgg.revenue, prevAgg.revenue),
          prev_orders: prevAgg.orders_count,
          prev_revenue: prevAgg.revenue,
        },
        operations,
        period_comparison: periodComparison,
      },
    };
  } catch (e) {
    return {
      ok: false,
      status: 500,
      error: e instanceof Error ? e.message : "Frühstücksdaten konnten nicht geladen werden",
    };
  }
}
