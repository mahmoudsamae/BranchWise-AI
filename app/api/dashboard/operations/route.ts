import { NextResponse } from "next/server";

import { fetchOperationsDashboard } from "@/lib/gm-hr/operations-dashboard";
import { requireGeneralManagerApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

/** GM operations dashboard — always loads live Supabase data (no demo mock). */
export async function GET() {
  const auth = await requireGeneralManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const operations = await fetchOperationsDashboard(supabase);
    return NextResponse.json({ operations });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load operations dashboard";
    console.error("[GET /api/dashboard/operations]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
