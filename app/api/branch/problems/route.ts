import { NextResponse } from "next/server";

import { createIssue, listIssues } from "@/lib/branch/problems";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

export async function GET() {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const issues = await listIssues(auth.session.branch_id);
    return NextResponse.json({ issues });
  } catch (e) {
    console.error("[GET /api/branch/problems]", e);
    return NextResponse.json({ error: "Could not load problems & projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  let body: { kind?: string; title?: string; stages?: string[]; costEstimate?: number | null; notes?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const kind = body.kind === "project" ? "project" : body.kind === "problem" ? "problem" : null;
  const title = body.title?.trim();
  if (!kind || !title) {
    return NextResponse.json({ error: "kind (problem|project) and title are required" }, { status: 400 });
  }

  try {
    const issue = await createIssue(auth.session.branch_id, auth.session.id, {
      kind,
      title,
      stages: body.stages,
      costEstimate: body.costEstimate ?? null,
      notes: body.notes ?? null,
    });
    return NextResponse.json({ issue }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/branch/problems]", e);
    return NextResponse.json({ error: "Could not create entry" }, { status: 500 });
  }
}
