import { NextResponse } from "next/server";

import { getIssue, updateIssue } from "@/lib/branch/problems";
import type { IssuePriority, IssueWorkflowStatus } from "@/lib/branch/issue-types";
import type { StageChecklists } from "@/lib/branch/issue-stage-data";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: {
    title?: string;
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
    const existing = body.activityAction ? await getIssue(auth.session.branch_id, id) : null;
    const issue = await updateIssue(
      id,
      auth.session.branch_id,
      {
        title: body.title,
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
        activityAction: body.activityAction,
        activityDetail: body.activityDetail,
      },
      existing ?? undefined,
    );
    return NextResponse.json({ issue });
  } catch (e) {
    console.error("[PATCH /api/branch/problems/[id]]", e);
    return NextResponse.json({ error: "Could not update entry" }, { status: 500 });
  }
}
