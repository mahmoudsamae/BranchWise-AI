import { NextResponse } from "next/server";

import { checkAnalyticsDeployed, linkBranchesFromBreakfastApi } from "@/lib/fruhstuck/branch-link";
import { getFruhstuckConfig, parseBreakfastRange } from "@/lib/fruhstuck/client";
import { requireGeneralManagerApi } from "@/lib/gm-hr/require-session";
import { syncFruhstuckData } from "@/lib/fruhstuck/sync-service";
import { createServiceRoleClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const auth = await requireGeneralManagerApi();
  if (!auth.ok) return auth.response;

  let body: { range?: string; branch_id?: string };
  try {
    body = (await request.json()) as { range?: string; branch_id?: string };
  } catch {
    body = {};
  }

  const range = parseBreakfastRange(body.range ?? "today");
  if (!range) {
    return NextResponse.json({ error: "Invalid range (today|yesterday|last7days|last30days)" }, { status: 400 });
  }

  const branchId = body.branch_id ? String(body.branch_id) : undefined;

  const cfg = getFruhstuckConfig();
  if (!cfg.ok) {
    console.error("[POST /api/fruhstuck/sync] config error:", cfg.error);
    return NextResponse.json({ error: cfg.error }, { status: 503 });
  }

  try {
    const supabase = createServiceRoleClient();

    const analyticsOk = await checkAnalyticsDeployed();
    if (!analyticsOk) {
      return NextResponse.json(
        {
          error:
            "Breakfast API endpoint /api/integration/analytics is not available on BREAKFAST_API_BASE_URL. Redeploy the breakfast-order app with the integration route, then sync again.",
          synced: 0,
          errors: [],
        },
        { status: 503 },
      );
    }

    await linkBranchesFromBreakfastApi(supabase);
    const result = await syncFruhstuckData(supabase, range, branchId);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[POST /api/fruhstuck/sync] error:", e);
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
