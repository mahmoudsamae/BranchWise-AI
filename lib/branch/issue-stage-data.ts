import {
  parseOwnerFunction,
  parsePriority,
  parseTaskStatus,
  type IssuePriority,
  type OwnerFunction,
  type TaskStatus,
} from "@/lib/branch/issue-types";

export type TaskSubtask = {
  id: string;
  text: string;
  done: boolean;
};

export type StageChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  status: TaskStatus;
  priority: IssuePriority;
  dueDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  ownerFunction: OwnerFunction;
  description: string | null;
  subtasks: TaskSubtask[];
};

export type StageChecklists = Record<string, StageChecklistItem[]>;

function parseSubtasks(raw: unknown): TaskSubtask[] {
  if (!Array.isArray(raw)) return [];
  const out: TaskSubtask[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const text = String(r.text ?? "").trim();
    if (!text) continue;
    out.push({
      id: String(r.id ?? text),
      text,
      done: Boolean(r.done),
    });
  }
  return out;
}

export function normalizeChecklistItem(raw: Record<string, unknown>): StageChecklistItem | null {
  const text = String(raw.text ?? "").trim();
  if (!text) return null;
  const done = Boolean(raw.done);
  const status = parseTaskStatus(raw.status, done);
  return {
    id: String(raw.id ?? text),
    text,
    done: status === "completed",
    status,
    priority: parsePriority(raw.priority),
    dueDate: raw.dueDate ? String(raw.dueDate) : null,
    assigneeId: raw.assigneeId ? String(raw.assigneeId) : null,
    assigneeName: raw.assigneeName ? String(raw.assigneeName) : null,
    ownerFunction: parseOwnerFunction(raw.ownerFunction),
    description: raw.description ? String(raw.description) : null,
    subtasks: parseSubtasks(raw.subtasks),
  };
}

export function parseStageChecklists(raw: unknown): StageChecklists {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: StageChecklists = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(v)) continue;
    const items: StageChecklistItem[] = [];
    for (const row of v) {
      if (!row || typeof row !== "object") continue;
      const item = normalizeChecklistItem(row as Record<string, unknown>);
      if (item) items.push(item);
    }
    if (items.length) out[k] = items;
  }
  return out;
}

export function checklistStats(items: StageChecklistItem[] | undefined): { done: number; total: number } {
  const list = items ?? [];
  return {
    done: list.filter((i) => i.status === "completed" || i.done).length,
    total: list.length,
  };
}

export function stageStatus(
  index: number,
  currentStage: number,
): "done" | "current" | "upcoming" {
  if (index < currentStage) return "done";
  if (index === currentStage) return "current";
  return "upcoming";
}

export function syncItemDone(item: StageChecklistItem): StageChecklistItem {
  const completed = item.status === "completed";
  return { ...item, done: completed, status: completed ? "completed" : item.status === "todo" && item.done ? "completed" : item.status };
}
