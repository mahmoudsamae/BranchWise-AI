import { NextResponse } from "next/server";

import { getIssueForGm } from "@/lib/branch/problems";
import { requireGeneralManagerApi } from "@/lib/gm-hr/require-session";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireGeneralManagerApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    const issue = await getIssueForGm(id);
    if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ issue });
  } catch (e) {
    console.error("[GET /api/dashboard/issues/[id]]", e);
    return NextResponse.json({ error: "Could not load entry" }, { status: 500 });
  }
}
