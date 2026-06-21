import { describe, expect, it } from "vitest";

import {
  assertIssuePatchAllowed,
  canEditIssueTasks,
  canManageIssue,
  isIssueOwner,
} from "@/lib/branch/issue-permissions";
import type { BranchIssue } from "@/lib/branch/problems";

const OWNER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_ID = "00000000-0000-4000-8000-000000000002";
const COLLAB_ID = "00000000-0000-4000-8000-000000000003";
const BRANCH_ID = "00000000-0000-4000-8000-000000000010";

function baseIssue(overrides: Partial<BranchIssue> = {}): BranchIssue {
  return {
    id: "issue-1",
    ownerBranchId: BRANCH_ID,
    ownerBranchName: "Regensburg",
    sharedWithMe: false,
    ownerUserId: OWNER_ID,
    ownerUserName: "Owner Chef",
    isOwner: false,
    canManage: false,
    canEditTasks: false,
    canMutateTaskList: false,
    isCollaborator: false,
    kind: "project",
    title: "Test",
    stages: ["A", "B"],
    currentStage: 0,
    status: "open",
    workflowStatus: "in_progress",
    priority: "medium",
    dueDate: null,
    stageDueDates: {},
    costEstimate: null,
    notes: null,
    stageNotes: {},
    stageChecklists: {},
    activities: [],
    collaborators: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("issue-permissions", () => {
  it("owner can manage and edit tasks", () => {
    const issue = baseIssue();
    expect(isIssueOwner(issue, OWNER_ID)).toBe(true);
    expect(canManageIssue(issue, OWNER_ID)).toBe(true);
    expect(canEditIssueTasks(issue, OWNER_ID)).toBe(true);
  });

  it("other campchef at same branch cannot manage but legacy without owner can", () => {
    const issue = baseIssue();
    expect(canManageIssue(issue, OTHER_ID)).toBe(false);
    expect(canEditIssueTasks(issue, OTHER_ID)).toBe(false);

    const legacy = baseIssue({ ownerUserId: null });
    expect(canManageIssue(legacy, OTHER_ID)).toBe(true);
    expect(canEditIssueTasks(legacy, OTHER_ID)).toBe(true);
  });

  it("collaborator can edit tasks but not manage meta", () => {
    const issue = baseIssue({
      sharedWithMe: true,
      collaborators: [
        {
          id: "c1",
          userId: COLLAB_ID,
          userName: "Collab",
          branchId: "other",
          branchName: "Other",
          invitedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    expect(canManageIssue(issue, COLLAB_ID)).toBe(false);
    expect(canEditIssueTasks(issue, COLLAB_ID)).toBe(true);
    expect(() => assertIssuePatchAllowed(issue, COLLAB_ID, { priority: "high" })).toThrow(
      /verantwortliche Campchef/,
    );
    expect(() =>
      assertIssuePatchAllowed(issue, COLLAB_ID, {
        stageChecklists: {
          "0": [{ id: "new", text: "x", done: false, status: "todo", priority: "medium", dueDate: null, assigneeId: null, assigneeName: null, ownerFunction: "filiale", description: null, subtasks: [] }],
        },
      }),
    ).toThrow(/hinzufügen, löschen oder verschieben/);
    expect(() =>
      assertIssuePatchAllowed(issue, COLLAB_ID, {
        stageChecklists: issue.stageChecklists,
      }),
    ).not.toThrow();
  });
});
