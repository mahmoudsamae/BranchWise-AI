import type { BranchIssue } from "@/lib/branch/problems";
import { checklistStructureChanged } from "@/lib/branch/issue-checklist-permissions";
import { parseStageChecklists, type StageChecklists } from "@/lib/branch/issue-stage-data";

export type IssuePatch = {
  title?: string;
  stages?: string[];
  currentStage?: number;
  status?: "open" | "done";
  workflowStatus?: string;
  priority?: string;
  dueDate?: string | null;
  stageDueDates?: Record<string, string>;
  notes?: string | null;
  costEstimate?: number | null;
  stageNotes?: Record<string, string>;
  stageChecklists?: unknown;
  collaborators?: unknown;
  activityAction?: string;
  activityDetail?: string;
};

const MANAGE_KEYS: (keyof IssuePatch)[] = [
  "title",
  "stages",
  "currentStage",
  "status",
  "workflowStatus",
  "priority",
  "dueDate",
  "stageDueDates",
  "notes",
  "costEstimate",
  "collaborators",
  "stageNotes",
];

const TASK_KEYS: (keyof IssuePatch)[] = ["stageChecklists"];

function isCollaborator(issue: BranchIssue, userId: string): boolean {
  return issue.collaborators.some((c) => c.userId === userId);
}

/** True when the viewer created / owns the issue at the owner branch. */
export function isIssueOwner(issue: BranchIssue, userId: string): boolean {
  if (!userId || !issue.ownerUserId) return false;
  return issue.ownerUserId === userId;
}

/**
 * Meta control: invite collaborators, close project, change priority/stages/status.
 * Legacy rows without ownerUserId: any Campchef at the owner branch may manage.
 */
export function canManageIssue(issue: BranchIssue, userId: string): boolean {
  if (issue.sharedWithMe || !userId) return false;
  if (issue.ownerUserId) return issue.ownerUserId === userId;
  return true;
}

/** Add/remove/reorder tasks or sections — owner only. */
export function canMutateTaskList(issue: BranchIssue, userId: string): boolean {
  return canManageIssue(issue, userId);
}

/** Update fields on existing tasks — owner or collaborator. */
export function canEditIssueTasks(issue: BranchIssue, userId: string): boolean {
  if (!userId) return false;
  if (canManageIssue(issue, userId)) return true;
  return isCollaborator(issue, userId);
}

export function isCollaboratorOnIssue(issue: BranchIssue, userId: string): boolean {
  return isCollaborator(issue, userId);
}

export function patchTouchesManage(patch: IssuePatch): boolean {
  return MANAGE_KEYS.some((key) => patch[key] !== undefined);
}

export function patchTouchesTasks(patch: IssuePatch): boolean {
  return TASK_KEYS.some((key) => patch[key] !== undefined);
}

export function assertIssuePatchAllowed(issue: BranchIssue, userId: string, patch: IssuePatch): void {
  if (patch.collaborators !== undefined && !canManageIssue(issue, userId)) {
    throw new Error("Nur der verantwortliche Campchef darf Mitwirkende verwalten");
  }
  if (patchTouchesManage(patch) && !canManageIssue(issue, userId)) {
    throw new Error("Nur der verantwortliche Campchef darf Projekt-Einstellungen ändern");
  }
  if (patchTouchesTasks(patch) && !canEditIssueTasks(issue, userId)) {
    throw new Error("Keine Berechtigung zum Bearbeiten der Aufgaben");
  }
  if (
    patch.stageChecklists !== undefined &&
    canEditIssueTasks(issue, userId) &&
    !canManageIssue(issue, userId)
  ) {
    const next = parseStageChecklists(patch.stageChecklists) as StageChecklists;
    if (checklistStructureChanged(issue.stageChecklists, next)) {
      throw new Error("Mitwirkende dürfen keine Aufgaben hinzufügen, löschen oder verschieben");
    }
  }
}

type IssuePermissionInput = Pick<
  BranchIssue,
  "ownerUserId" | "sharedWithMe" | "collaborators"
>;

export function enrichIssuePermissions(
  issue: IssuePermissionInput,
  userId: string,
): Pick<BranchIssue, "isOwner" | "canManage" | "canEditTasks" | "canMutateTaskList" | "isCollaborator"> {
  const partial = issue as BranchIssue;
  const collaborator = isCollaborator(partial, userId);
  return {
    isOwner: isIssueOwner(partial, userId),
    canManage: canManageIssue(partial, userId),
    canEditTasks: canEditIssueTasks(partial, userId),
    canMutateTaskList: canMutateTaskList(partial, userId),
    isCollaborator: collaborator && !canManageIssue(partial, userId),
  };
}
