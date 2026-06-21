import { describe, expect, it } from "vitest";

import { checklistStructureChanged } from "@/lib/branch/issue-checklist-permissions";
import type { StageChecklists } from "@/lib/branch/issue-stage-data";

const item = (id: string, text: string) => ({
  id,
  text,
  done: false,
  status: "todo" as const,
  priority: "medium" as const,
  dueDate: null,
  assigneeId: null,
  assigneeName: null,
  ownerFunction: "filiale" as const,
  description: null,
  subtasks: [],
});

describe("issue-checklist-permissions", () => {
  it("detects add/remove/reorder but ignores field edits", () => {
    const before: StageChecklists = { "0": [item("a", "One"), item("b", "Two")] };
    const edited: StageChecklists = {
      "0": [
        { ...item("a", "One"), status: "completed", done: true },
        item("b", "Two"),
      ],
    };
    const added: StageChecklists = { "0": [...before["0"]!, item("c", "Three")] };
    const reordered: StageChecklists = { "0": [item("b", "Two"), item("a", "One")] };

    expect(checklistStructureChanged(before, edited)).toBe(false);
    expect(checklistStructureChanged(before, added)).toBe(true);
    expect(checklistStructureChanged(before, reordered)).toBe(true);
  });
});
