import { NextResponse } from "next/server";

import type { IssueCollaborator, IssuePriority, IssueWorkflowStatus } from "@/lib/branch/issue-types";
import type { StageChecklists } from "@/lib/branch/issue-stage-data";
import { getIssueAccessible, updateIssueAccessible } from "@/lib/branch/problems";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: {
    title?: string;
    stages?: string[];
    currentStage?: number;
    status?: string;
    workflowStatus?: IssueWorkflowStatus;
    priority?: IssuePriority;
    dueDate?: string | null;
    stageDueDates?: Record<string, string>;
    notes?: string | null;
    costEstimate?: number | null;
    stageNotes?: Record<string, string>;
    stageChecklists?: StageChecklists;
    collaborators?: IssueCollaborator[];
    activityAction?: string;
    activityDetail?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const status = body.status === "done" ? "done" : body.status === "open" ? "open" : undefined;

  try {
    const viewer = { branchId: auth.session.branch_id, userId: auth.session.id };
    const existing = await getIssueAccessible(id, viewer);
    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const issue = await updateIssueAccessible(id, viewer, {
      title: body.title,
      stages: body.stages,
      currentStage: body.currentStage,
      status,
      workflowStatus: body.workflowStatus,
      priority: body.priority,
      dueDate: body.dueDate,
      stageDueDates: body.stageDueDates,
      notes: body.notes,
      costEstimate: body.costEstimate,
      stageNotes: body.stageNotes,
      stageChecklists: body.stageChecklists,
      collaborators: body.collaborators,
      activityAction: body.activityAction,
      activityDetail: body.activityDetail,
    });
    return NextResponse.json({ issue });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update entry";
    console.error("[PATCH /api/branch/problems/[id]]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
