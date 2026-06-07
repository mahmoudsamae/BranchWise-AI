import { getFruhstuckConfig } from "./client";

export type BreakfastHealth = {
  configured: boolean;
  base_url: string | null;
  branches_api: "ok" | "fail" | "skipped";
  analytics_route: "ok" | "not_deployed" | "unauthorized" | "fail";
  token_hint: string | null;
  sample_branch: string;
  detail: string | null;
};

/** Probe breakfast-order: /api/branches + /api/integration/analytics */
export async function probeBreakfastHealth(): Promise<BreakfastHealth> {
  const cfg = getFruhstuckConfig();
  if (!cfg.ok) {
    return {
      configured: false,
      base_url: null,
      branches_api: "skipped",
      analytics_route: "fail",
      token_hint: null,
      sample_branch: "hannover",
      detail: cfg.error,
    };
  }

  const result: BreakfastHealth = {
    configured: true,
    base_url: cfg.baseUrl,
    branches_api: "fail",
    analytics_route: "fail",
    token_hint: null,
    sample_branch: "hannover",
    detail: null,
  };

  try {
    const branchesRes = await fetch(`${cfg.baseUrl}/api/branches`, {
      headers: { "x-integration-token": cfg.token },
      cache: "no-store",
    });
    result.branches_api = branchesRes.ok ? "ok" : "fail";

    const analyticsUrl = `${cfg.baseUrl}/api/integration/analytics?branch=hannover&range=today`;
    const analyticsRes = await fetch(analyticsUrl, {
      headers: { "x-integration-token": cfg.token },
      cache: "no-store",
    });
    const text = await analyticsRes.text();

    if (analyticsRes.status === 401) {
      result.analytics_route = "unauthorized";
      result.token_hint =
        "On breakfast-order set BRANCHWISE_INTEGRATION_TOKEN to the same value as BranchWise BREAKFAST_INTEGRATION_TOKEN.";
      result.detail = "unauthorized";
      return result;
    }

    if (analyticsRes.status === 404 && (text.includes("<!DOCTYPE") || text.includes("<html"))) {
      result.analytics_route = "not_deployed";
      result.detail =
        "Route /api/integration/analytics returns HTML 404 — deploy app/api/integration/analytics/route.ts on Vercel.";
      return result;
    }

    if (!analyticsRes.ok) {
      try {
        const j = JSON.parse(text) as { error?: string };
        result.detail = j.error ?? `HTTP ${analyticsRes.status}`;
        if (j.error === "branch_not_found") {
          result.detail = "branch_not_found — check external_id slug in Branches";
        }
      } catch {
        result.detail = `HTTP ${analyticsRes.status}`;
      }
      return result;
    }

    const json = JSON.parse(text) as { ok?: boolean };
    if (json.ok) {
      result.analytics_route = "ok";
      result.detail = null;
    } else {
      result.detail = "API returned ok: false";
    }
  } catch (e) {
    result.detail = e instanceof Error ? e.message : "Probe failed";
  }

  return result;
}
