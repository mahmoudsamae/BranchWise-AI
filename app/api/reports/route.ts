import { NextResponse } from "next/server";

import { listReports } from "@/lib/gm-hr/reports-query";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  try {
    const supabase = createServiceRoleClient();
    const result = await listReports(supabase, {
      viewerRole: auth.session.role,
      type: url.searchParams.get("type"),
      status: url.searchParams.get("status"),
      branch_id: url.searchParams.get("branch_id"),
      start: url.searchParams.get("start"),
      end: url.searchParams.get("end"),
      search: url.searchParams.get("search"),
      limit: Number(url.searchParams.get("limit") ?? "50"),
      offset: Number(url.searchParams.get("offset") ?? "0"),
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load reports";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
