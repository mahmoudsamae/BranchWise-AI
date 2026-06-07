import { NextResponse } from "next/server";

import { fetchDashboardStats } from "@/lib/gm-hr/dashboard-stats";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  const hrOnly = auth.session.role === "hr" || scope === "hr";

  try {
    const supabase = createServiceRoleClient();
    const stats = await fetchDashboardStats(supabase, {
      hrOnly,
      gmUserId: auth.session.role === "general_manager" ? auth.session.id : undefined,
    });
    return NextResponse.json({ stats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load stats";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
