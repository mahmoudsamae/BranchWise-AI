import { checklistStats } from "@/lib/branch/issue-stage-data";
import type { BranchIssue } from "@/lib/branch/problems";

import type { IssueActivity, IssueWorkflowStatus } from "./issue-types";

export type HubStats = {
  active: number;
  completed: number;
  blocked: number;
  dueSoon: number;
  avgProgress: number;
};

export type FlatTask = {
  stageIndex: number;
  stageName: string;
  itemId: string;
  text: string;
  status: import("./issue-types").TaskStatus;
  priority: import("./issue-types").IssuePriority;
  dueDate: string | null;
};

export function issueProgressPercent(issue: BranchIssue): number {
  const stageCount = Math.max(issue.stages.length, 1);
  const stageProgress = issue.status === "done" ? 1 : issue.currentStage / stageCount;
  let taskDone = 0;
  let taskTotal = 0;
  for (const items of Object.values(issue.stageChecklists)) {
    const s = checklistStats(items);
    taskDone += s.done;
    taskTotal += s.total;
  }
  const taskProgress = taskTotal > 0 ? taskDone / taskTotal : stageProgress;
  return Math.round((stageProgress * 0.55 + taskProgress * 0.45) * 100);
}

export function buildStatusLine(issue: BranchIssue): string {
  const stage = issue.stages[issue.currentStage] ?? "";
  const stageNote = issue.stageNotes[String(issue.currentStage)];
  const parts: string[] = [];
  if (issue.costEstimate && /kalkulation|entscheidung/i.test(stage)) {
    parts.push(`${stage}: €${issue.costEstimate.toLocaleString("de-DE")}`);
  } else if (stage) {
    parts.push(stage);
  }
  if (stageNote) parts.push(stageNote);
  else if (issue.notes?.trim()) parts.push(issue.notes.trim());
  if (issue.workflowStatus === "blocked") parts.push("Blockiert — Handlung nötig");
  return parts.join(" · ") || "—";
}

export function computeHubStats(issues: BranchIssue[]): HubStats {
  const open = issues.filter((i) => i.status === "open");
  const today = new Date().toISOString().slice(0, 10);
  const weekLater = new Date();
  weekLater.setUTCDate(weekLater.getUTCDate() + 7);
  const weekStr = weekLater.toISOString().slice(0, 10);

  const dueSoon = open.filter((i) => i.dueDate && i.dueDate >= today && i.dueDate <= weekStr).length;
  const blocked = open.filter((i) => i.workflowStatus === "blocked").length;
  const avgProgress =
    open.length > 0 ? Math.round(open.reduce((sum, i) => sum + issueProgressPercent(i), 0) / open.length) : 0;

  return {
    active: open.length,
    completed: issues.filter((i) => i.status === "done").length,
    blocked,
    dueSoon,
    avgProgress,
  };
}

export function flattenIssueTasks(issue: BranchIssue): FlatTask[] {
  const out: FlatTask[] = [];
  for (let i = 0; i < issue.stages.length; i++) {
    const items = issue.stageChecklists[String(i)] ?? [];
    for (const item of items) {
      out.push({
        stageIndex: i,
        stageName: issue.stages[i] ?? `Phase ${i + 1}`,
        itemId: item.id,
        text: item.text,
        status: item.status,
        priority: item.priority,
        dueDate: item.dueDate,
      });
    }
  }
  return out;
}

export function recentActivities(issues: BranchIssue[], limit = 8): (IssueActivity & { issueTitle: string })[] {
  const rows: (IssueActivity & { issueTitle: string })[] = [];
  for (const issue of issues) {
    for (const act of issue.activities) {
      rows.push({ ...act, issueTitle: issue.title });
    }
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

export function matchesSearch(issue: BranchIssue, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  if (issue.title.toLowerCase().includes(needle)) return true;
  if (issue.notes?.toLowerCase().includes(needle)) return true;
  for (const stage of issue.stages) {
    if (stage.toLowerCase().includes(needle)) return true;
  }
  for (const note of Object.values(issue.stageNotes)) {
    if (note.toLowerCase().includes(needle)) return true;
  }
  for (const items of Object.values(issue.stageChecklists)) {
    for (const item of items ?? []) {
      if (item.text.toLowerCase().includes(needle)) return true;
    }
  }
  return false;
}

export function workflowFromLegacy(issue: Pick<BranchIssue, "status" | "workflowStatus">): IssueWorkflowStatus {
  if (issue.status === "done") return "completed";
  return issue.workflowStatus;
}
