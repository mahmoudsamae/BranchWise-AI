import { NextResponse } from "next/server";

import { getBranchReviewsSummary } from "@/lib/branch/branch-reviews-summary";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

export async function GET() {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const summary = await getBranchReviewsSummary(auth.session.branch_id);
    return NextResponse.json(summary);
  } catch (e) {
    console.error("[GET /api/branch/reviews]", e);
    return NextResponse.json({ error: "Could not load reviews" }, { status: 500 });
  }
}
