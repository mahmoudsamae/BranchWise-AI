import { NextResponse } from "next/server";

import { isDemoSession } from "@/lib/demo/guard";
import { demoAnalyticsTrends } from "@/lib/demo/mock-data";
import { getAnalyticsTrends } from "@/lib/gm-hr/analytics-service";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;
  if (isDemoSession(auth.session)) return NextResponse.json(demoAnalyticsTrends());

  const url = new URL(request.url);
  try {
    const supabase = createServiceRoleClient();
    const data = await getAnalyticsTrends(supabase, {
      period: url.searchParams.get("period"),
      start: url.searchParams.get("start"),
      end: url.searchParams.get("end"),
      branchId: url.searchParams.get("branch_id"),
      hrOnly: auth.session.role === "hr",
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[GET /api/analytics/trends] error:", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
