import { NextResponse } from "next/server";

import { getBranchSubmissionHistory } from "@/lib/branch/submission-history";
import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET() {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const history = await getBranchSubmissionHistory(supabase, auth.session.branch_id);
    return NextResponse.json({ history });
  } catch (e) {
    console.error("[GET /api/branch/analytics]", e);
    return NextResponse.json({ error: "Could not load analytics" }, { status: 500 });
  }
}
