import { NextResponse } from "next/server";

import { getAnalyticsComparison } from "@/lib/gm-hr/analytics-service";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const raw = url.searchParams.get("branches") ?? "";
  const branchIds = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6);
  if (branchIds.length === 0) {
    return NextResponse.json({ error: "branches query required" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const data = await getAnalyticsComparison(supabase, branchIds, auth.session.role === "hr");
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
