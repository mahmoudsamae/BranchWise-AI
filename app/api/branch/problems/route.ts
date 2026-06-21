import { NextResponse } from "next/server";

import { createIssue, listIssuesForUser } from "@/lib/branch/problems";
import type { IssuePriority, IssueWorkflowStatus } from "@/lib/branch/issue-types";
import type { StageChecklists } from "@/lib/branch/issue-stage-data";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

export async function GET() {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const issues = await listIssuesForUser(auth.session.branch_id, auth.session.id);
    return NextResponse.json({ issues });
  } catch (e) {
    console.error("[GET /api/branch/problems]", e);
    return NextResponse.json({ error: "Could not load problems & projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  let body: {
    kind?: string;
    title?: string;
    stages?: string[];
    stageChecklists?: StageChecklists;
    costEstimate?: number | null;
    notes?: string | null;
    priority?: IssuePriority;
    dueDate?: string | null;
    workflowStatus?: IssueWorkflowStatus;
  };
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
      stageChecklists: body.stageChecklists,
      costEstimate: body.costEstimate ?? null,
      notes: body.notes ?? null,
      priority: body.priority,
      dueDate: body.dueDate ?? null,
      workflowStatus: body.workflowStatus,
    });
    return NextResponse.json({ issue }, { status: 201 });
  } catch (e) {
    console.error("[POST /api/branch/problems]", e);
    return NextResponse.json({ error: "Could not create entry" }, { status: 500 });
  }
}
