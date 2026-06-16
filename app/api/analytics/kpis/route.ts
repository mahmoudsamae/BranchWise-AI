import { NextResponse } from "next/server";

import { isDemoSession } from "@/lib/demo/guard";
import { demoAnalyticsKpis } from "@/lib/demo/mock-data";
import { getAnalyticsKpis } from "@/lib/gm-hr/analytics-service";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;
  if (isDemoSession(auth.session)) return NextResponse.json(demoAnalyticsKpis());

  const url = new URL(request.url);
  const hrOnly = auth.session.role === "hr";

  try {
    const supabase = createServiceRoleClient();
    const data = await getAnalyticsKpis(supabase, {
      period: url.searchParams.get("period"),
      start: url.searchParams.get("start"),
      end: url.searchParams.get("end"),
      branchId: url.searchParams.get("branch_id"),
      hrOnly,
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[GET /api/analytics/kpis] error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
