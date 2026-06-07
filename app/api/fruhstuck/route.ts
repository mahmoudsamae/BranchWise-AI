import { NextResponse } from "next/server";

import {
  fetchBreakfastAnalytics,
  getFruhstuckConfig,
  mapAnalyticsToPayload,
  parseBreakfastRange,
} from "@/lib/fruhstuck/client";
import { requireGeneralManagerApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";
import type { BreakfastAnalyticsData, FruhstuckBranchPayload } from "@/lib/fruhstuck/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function payloadFromStoredRow(row: {
  branch_id: string;
  orders_count: number;
  revenue: number;
  top_item: string | null;
  items: unknown;
  raw_data: unknown;
  synced_at: string;
  date: string;
  branches: { name?: string; external_id?: string | null } | { name?: string; external_id?: string | null }[] | null;
}): FruhstuckBranchPayload {
  const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches;
  const raw = (row.raw_data ?? {}) as BreakfastAnalyticsData;
  const items = Array.isArray(row.items) ? (row.items as FruhstuckBranchPayload["items"]) : raw.products?.topProducts ?? [];

  return {
    branch_id: row.branch_id,
    branch_name: branch?.name ?? "Unknown",
    external_id: branch?.external_id ?? "",
    orders_count: Number(row.orders_count ?? 0),
    revenue: Number(row.revenue ?? 0),
    top_product: row.top_item,
    trend_pct: raw.comparisons?.ordersLast7VsPrev7Pct ?? null,
    items,
    raw_data: raw,
    synced_at: row.synced_at,
    date: row.date,
  };
}

export async function GET(request: Request) {
  const auth = await requireGeneralManagerApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range");
  const date = (url.searchParams.get("date") ?? todayIso()).slice(0, 10);
  const branchId = url.searchParams.get("branch_id");

  const cfg = getFruhstuckConfig();
  if (!cfg.ok) {
    console.error("[GET /api/fruhstuck] config error:", cfg.error);
    return NextResponse.json({ error: cfg.error }, { status: 503 });
  }

  try {
    const supabase = createServiceRoleClient();

    let branchQuery = supabase
      .from("branches")
      .select("id, name, external_id")
      .eq("is_active", true)
      .not("external_id", "is", null)
      .order("name");

    if (branchId && branchId !== "all") branchQuery = branchQuery.eq("id", branchId);

    const { data: branchRows, error: bErr } = await branchQuery;
    if (bErr) {
      console.error("[GET /api/fruhstuck] branches error:", bErr);
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }

    const branches = (branchRows ?? []).filter((b) => String(b.external_id ?? "").trim());

    if (rangeParam) {
      const range = parseBreakfastRange(rangeParam);
      if (!range) {
        return NextResponse.json({ error: "Invalid range" }, { status: 400 });
      }

      const liveBranches: FruhstuckBranchPayload[] = [];
      const errors: { branch_id: string; branch_name: string; message: string }[] = [];

      for (const b of branches) {
        const slug = String(b.external_id).trim();
        const { data: apiData, error: fetchErr } = await fetchBreakfastAnalytics(slug, range);
        if (fetchErr || !apiData) {
          errors.push({
            branch_id: b.id,
            branch_name: b.name,
            message: fetchErr ?? "No data",
          });
          continue;
        }
        liveBranches.push(
          mapAnalyticsToPayload(
            { id: b.id, name: b.name, external_id: slug },
            apiData,
            { date: todayIso() },
          ),
        );
      }

      const { data: lastSync } = await supabase
        .from("fruhstuck_data")
        .select("synced_at")
        .order("synced_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        mode: "live",
        range,
        branches: liveBranches,
        errors,
        last_synced_at: lastSync?.synced_at ?? null,
      });
    }

    let query = supabase
      .from("fruhstuck_data")
      .select(
        "id, branch_id, date, orders_count, revenue, top_item, items, raw_data, synced_at, branches(name, external_id)",
      )
      .eq("date", date);

    if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);

    const { data, error } = await query.order("revenue", { ascending: false });
    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ branches: [], warning: "Run migration 20260525000000_fruhstuck_integration" });
      }
      console.error("[GET /api/fruhstuck] query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const storedBranches = (data ?? []).map((row) => payloadFromStoredRow(row));

    const { data: lastSync } = await supabase
      .from("fruhstuck_data")
      .select("synced_at")
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      mode: "stored",
      date,
      branches: storedBranches,
      last_synced_at: lastSync?.synced_at ?? null,
    });
  } catch (e) {
    console.error("[GET /api/fruhstuck] error:", e);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
