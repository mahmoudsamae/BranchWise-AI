import type { IssueWorkflowStatus } from "@/lib/branch/issue-types";

export type LifecyclePatch = {
  status?: "open" | "done";
  workflowStatus?: IssueWorkflowStatus;
};

/** Workflow values shown while an issue is still open (completion uses Abschließen). */
export const ACTIVE_WORKFLOW_STATUSES: IssueWorkflowStatus[] = ["planning", "in_progress", "blocked"];

export function isIssueClosed(status: "open" | "done", workflowStatus: IssueWorkflowStatus): boolean {
  return status === "done" || workflowStatus === "completed";
}

/** Keeps `status` and `workflow_status` aligned on every update. */
export function normalizeLifecyclePatch(
  patch: LifecyclePatch,
  existing?: { status: "open" | "done"; workflowStatus: IssueWorkflowStatus },
): LifecyclePatch {
  if (patch.status === "done" || patch.workflowStatus === "completed") {
    return { status: "done", workflowStatus: "completed" };
  }

  if (patch.status === "open") {
    const nextWorkflow =
      patch.workflowStatus ??
      (existing?.workflowStatus === "completed" ? "in_progress" : existing?.workflowStatus ?? "in_progress");
    return { status: "open", workflowStatus: nextWorkflow };
  }

  if (patch.workflowStatus !== undefined) {
    return { status: "open", workflowStatus: patch.workflowStatus };
  }

  return patch;
}

export function closeIssueFields(): LifecyclePatch {
  return { status: "done", workflowStatus: "completed" };
}

export function reopenIssueFields(
  workflowStatus: IssueWorkflowStatus = "in_progress",
): LifecyclePatch {
  return { status: "open", workflowStatus };
}
