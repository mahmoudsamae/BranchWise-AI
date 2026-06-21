import { NextResponse } from "next/server";

import { listAllIssuesForGm } from "@/lib/branch/problems";
import { requireGeneralManagerApi } from "@/lib/gm-hr/require-session";

export async function GET() {
  const auth = await requireGeneralManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const issues = await listAllIssuesForGm();
    return NextResponse.json({ issues });
  } catch (e) {
    console.error("[GET /api/dashboard/issues]", e);
    return NextResponse.json({ error: "Could not load projects & problems" }, { status: 500 });
  }
}
