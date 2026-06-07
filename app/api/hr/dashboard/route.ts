import { NextResponse } from "next/server";

import { fetchHrDashboard } from "@/lib/hr/dashboard-service";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET() {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const data = await fetchHrDashboard(supabase);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[GET /api/hr/dashboard]", e);
    return NextResponse.json({ error: "Failed to load HR dashboard" }, { status: 500 });
  }
}
