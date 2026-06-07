import type { BreakfastAnalyticsResponse, BreakfastRange } from "./types";
import { BREAKFAST_RANGES } from "./types";

export function getFruhstuckConfig() {
  const baseUrl = (
    process.env.BREAKFAST_API_BASE_URL ??
    process.env.FRUHSTUCK_API_URL
  )?.replace(/\/$/, "");
  const token = process.env.BREAKFAST_INTEGRATION_TOKEN ?? process.env.FRUHSTUCK_API_KEY;
  if (!baseUrl || !token) {
    return {
      ok: false as const,
      error: "BREAKFAST_API_BASE_URL and BREAKFAST_INTEGRATION_TOKEN must be set on the server.",
    };
  }
  return { ok: true as const, baseUrl, token };
}

export function parseBreakfastRange(value: string | null): BreakfastRange | null {
  const v = (value ?? "today").toLowerCase();
  return BREAKFAST_RANGES.includes(v as BreakfastRange) ? (v as BreakfastRange) : null;
}

function shortHttpError(text: string, status: number): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html") || trimmed.includes("<html")) {
    return `HTTP ${status}: API returned HTML (check BREAKFAST_API_BASE_URL and branch slug)`;
  }
  try {
    const j = JSON.parse(trimmed) as { error?: string; message?: string };
    return j.error ?? j.message ?? trimmed.slice(0, 180);
  } catch {
    return trimmed.slice(0, 180) || `HTTP ${status}`;
  }
}

export async function fetchBreakfastAnalytics(
  branchSlug: string,
  range: BreakfastRange,
): Promise<{ data: BreakfastAnalyticsResponse | null; error: string | null }> {
  const cfg = getFruhstuckConfig();
  if (!cfg.ok) return { data: null, error: cfg.error };

  const url = new URL(`${cfg.baseUrl}/api/integration/analytics`);
  url.searchParams.set("branch", branchSlug);
  url.searchParams.set("range", range);

  try {
    const res = await fetch(url.toString(), {
      headers: { "x-integration-token": cfg.token },
      cache: "no-store",
    });

    const text = await res.text();

    if (!res.ok) {
      console.error("[fruhstuck] analytics HTTP error:", res.status, branchSlug, range);
      return { data: null, error: shortHttpError(text, res.status) };
    }

    let json: unknown;
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      console.error("[fruhstuck] invalid JSON response for", branchSlug);
      return { data: null, error: "Invalid JSON from breakfast API" };
    }

    const payload = json as BreakfastAnalyticsResponse;
    if (!payload.ok || !payload.data?.summary) {
      const err = (json as { error?: string })?.error ?? "API returned ok: false";
      console.error("[fruhstuck] analytics ok:false:", branchSlug, err);
      return { data: null, error: err };
    }

    return { data: payload, error: null };
  } catch (e) {
    console.error("[fruhstuck] fetchBreakfastAnalytics failed:", e);
    return { data: null, error: e instanceof Error ? e.message : "Request failed" };
  }
}

export function mapAnalyticsToPayload(
  branch: { id: string; name: string; external_id: string },
  response: BreakfastAnalyticsResponse,
  extras?: { synced_at?: string | null; date?: string },
) {
  const d = response.data;
  const top = d.products?.topProducts?.[0]?.name ?? d.products?.productsBreakdown?.[0]?.name ?? null;
  return {
    branch_id: branch.id,
    branch_name: branch.name,
    external_id: branch.external_id,
    orders_count: Number(d.summary.orders ?? 0),
    revenue: Number(d.summary.revenue ?? 0),
    top_product: top,
    trend_pct: d.comparisons?.ordersLast7VsPrev7Pct ?? d.comparisons?.revenueLast7VsPrev7Pct ?? null,
    items: d.products?.topProducts ?? [],
    raw_data: d,
    synced_at: extras?.synced_at ?? null,
    date: extras?.date,
  };
}
