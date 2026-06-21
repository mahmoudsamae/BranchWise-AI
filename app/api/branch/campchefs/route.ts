import { NextResponse } from "next/server";

import { listCampchefs } from "@/lib/branch/problems";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

export async function GET() {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const branchId = auth.session.branch_id;
  if (!branchId) {
    return NextResponse.json({ error: "No branch assigned" }, { status: 400 });
  }

  try {
    const campchefs = await listCampchefs(branchId);
    return NextResponse.json({ campchefs });
  } catch (e) {
    console.error("[GET /api/branch/campchefs]", e);
    return NextResponse.json({ error: "Could not load campchefs" }, { status: 500 });
  }
}
