import { NextResponse } from "next/server";

import { updateIssue } from "@/lib/branch/problems";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: { currentStage?: number; status?: string; notes?: string | null; costEstimate?: number | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = body.status === "done" ? "done" : body.status === "open" ? "open" : undefined;

  try {
    const issue = await updateIssue(id, auth.session.branch_id, {
      currentStage: body.currentStage,
      status,
      notes: body.notes,
      costEstimate: body.costEstimate,
    });
    return NextResponse.json({ issue });
  } catch (e) {
    console.error("[PATCH /api/branch/problems/[id]]", e);
    return NextResponse.json({ error: "Could not update entry" }, { status: 500 });
  }
}
