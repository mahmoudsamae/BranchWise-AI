import { NextResponse } from "next/server";

import { demoBranchNpsAnalytics, fetchBranchNpsAnalytics } from "@/lib/branch/fetch-branch-nps";
import { isDemoSession } from "@/lib/demo/guard";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

export async function GET() {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  if (isDemoSession(auth.session)) {
    return NextResponse.json({ nps: demoBranchNpsAnalytics() });
  }

  const branchId = auth.session.branch_id;
  if (!branchId) {
    return NextResponse.json({ error: "No branch assigned" }, { status: 400 });
  }

  try {
    const nps = await fetchBranchNpsAnalytics(branchId);
    return NextResponse.json({ nps });
  } catch (e) {
    console.error("[GET /api/branch/nps-analytics]", e);
    return NextResponse.json({ error: "Could not load NPS analytics" }, { status: 500 });
  }
}
