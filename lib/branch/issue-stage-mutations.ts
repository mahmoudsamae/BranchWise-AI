import type { StageChecklistItem, StageChecklists } from "@/lib/branch/issue-stage-data";
import type { BranchIssue } from "@/lib/branch/problems";

type StagePatch = Pick<
  BranchIssue,
  "stages" | "stageChecklists" | "stageNotes" | "stageDueDates" | "currentStage"
>;

function cloneChecklistItems(items: StageChecklistItem[]): StageChecklistItem[] {
  return items.map((item) => ({ ...item, id: crypto.randomUUID() }));
}

function reindexAfterInsert(
  issue: BranchIssue,
  atIndex: number,
  fillAt: StageChecklists[string] | "copy",
  copyFromIndex?: number,
): StagePatch {
  const stages = [...issue.stages];
  stages.splice(atIndex, 0, fillAt === "copy" ? `${issue.stages[copyFromIndex!]} (Kopie)` : "Neuer Abschnitt");

  const stageChecklists: StageChecklists = {};
  const stageNotes: Record<string, string> = {};
  const stageDueDates: Record<string, string> = {};

  for (let newIdx = 0; newIdx < stages.length; newIdx++) {
    if (newIdx < atIndex) {
      stageChecklists[String(newIdx)] = issue.stageChecklists[String(newIdx)] ?? [];
      if (issue.stageNotes[String(newIdx)]) stageNotes[String(newIdx)] = issue.stageNotes[String(newIdx)]!;
      if (issue.stageDueDates[String(newIdx)]) stageDueDates[String(newIdx)] = issue.stageDueDates[String(newIdx)]!;
    } else if (newIdx === atIndex) {
      if (fillAt === "copy" && copyFromIndex !== undefined) {
        stageChecklists[String(newIdx)] = cloneChecklistItems(issue.stageChecklists[String(copyFromIndex)] ?? []);
        if (issue.stageNotes[String(copyFromIndex)]) stageNotes[String(newIdx)] = issue.stageNotes[String(copyFromIndex)]!;
        if (issue.stageDueDates[String(copyFromIndex)]) stageDueDates[String(newIdx)] = issue.stageDueDates[String(copyFromIndex)]!;
      } else {
        stageChecklists[String(newIdx)] = Array.isArray(fillAt) ? fillAt : [];
      }
    } else {
      stageChecklists[String(newIdx)] = issue.stageChecklists[String(newIdx - 1)] ?? [];
      if (issue.stageNotes[String(newIdx - 1)]) stageNotes[String(newIdx)] = issue.stageNotes[String(newIdx - 1)]!;
      if (issue.stageDueDates[String(newIdx - 1)]) stageDueDates[String(newIdx)] = issue.stageDueDates[String(newIdx - 1)]!;
    }
  }

  let currentStage = issue.currentStage;
  if (atIndex <= currentStage) currentStage += 1;

  return { stages, stageChecklists, stageNotes, stageDueDates, currentStage };
}

function reindexAfterRemove(issue: BranchIssue, atIndex: number): StagePatch | null {
  if (issue.stages.length <= 1) return null;

  const stages = issue.stages.filter((_, i) => i !== atIndex);
  const stageChecklists: StageChecklists = {};
  const stageNotes: Record<string, string> = {};
  const stageDueDates: Record<string, string> = {};

  let newIdx = 0;
  for (let oldIdx = 0; oldIdx < issue.stages.length; oldIdx++) {
    if (oldIdx === atIndex) continue;
    stageChecklists[String(newIdx)] = issue.stageChecklists[String(oldIdx)] ?? [];
    if (issue.stageNotes[String(oldIdx)]) stageNotes[String(newIdx)] = issue.stageNotes[String(oldIdx)]!;
    if (issue.stageDueDates[String(oldIdx)]) stageDueDates[String(newIdx)] = issue.stageDueDates[String(oldIdx)]!;
    newIdx++;
  }

  let currentStage = issue.currentStage;
  if (atIndex < currentStage) currentStage -= 1;
  else if (atIndex === currentStage) currentStage = Math.min(currentStage, stages.length - 1);

  return { stages, stageChecklists, stageNotes, stageDueDates, currentStage };
}

export function renameStage(issue: BranchIssue, stageIndex: number, name: string): StagePatch {
  const stages = [...issue.stages];
  stages[stageIndex] = name.trim() || stages[stageIndex]!;
  return {
    stages,
    stageChecklists: issue.stageChecklists,
    stageNotes: issue.stageNotes,
    stageDueDates: issue.stageDueDates,
    currentStage: issue.currentStage,
  };
}

export function insertStageBelow(issue: BranchIssue, afterIndex: number, name?: string): StagePatch {
  const patch = reindexAfterInsert(issue, afterIndex + 1, []);
  if (name?.trim()) patch.stages[afterIndex + 1] = name.trim();
  return patch;
}

export function insertStageAtEnd(issue: BranchIssue, name = "Neuer Abschnitt"): StagePatch {
  return insertStageBelow(issue, issue.stages.length - 1, name);
}

export function duplicateStage(issue: BranchIssue, stageIndex: number): StagePatch {
  return reindexAfterInsert(issue, stageIndex + 1, "copy", stageIndex);
}

export function deleteStage(issue: BranchIssue, stageIndex: number): StagePatch | null {
  return reindexAfterRemove(issue, stageIndex);
}

export function setCurrentStage(issue: BranchIssue, stageIndex: number): StagePatch {
  return {
    stages: issue.stages,
    stageChecklists: issue.stageChecklists,
    stageNotes: issue.stageNotes,
    stageDueDates: issue.stageDueDates,
    currentStage: Math.max(0, Math.min(stageIndex, issue.stages.length - 1)),
  };
}
