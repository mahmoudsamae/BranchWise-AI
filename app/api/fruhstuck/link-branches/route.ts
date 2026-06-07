import { NextResponse } from "next/server";

import { checkAnalyticsDeployed, linkBranchesFromBreakfastApi } from "@/lib/fruhstuck/branch-link";
import { requireGeneralManagerApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function POST() {
  const auth = await requireGeneralManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const result = await linkBranchesFromBreakfastApi(supabase);
    const analytics_deployed = await checkAnalyticsDeployed();

    return NextResponse.json({
      ...result,
      analytics_deployed,
      hint: analytics_deployed
        ? null
        : "Breakfast API /api/integration/analytics is not deployed on BREAKFAST_API_BASE_URL. Redeploy the breakfast app, then sync again.",
    });
  } catch (e) {
    console.error("[POST /api/fruhstuck/link-branches] error:", e);
    return NextResponse.json({ error: "Link failed" }, { status: 500 });
  }
}
