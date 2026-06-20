import { parsePriority, parseTaskStatus, type IssuePriority, type TaskStatus } from "@/lib/branch/issue-types";

export type StageChecklistItem = {
  id: string;
  text: string;
  done: boolean;
  status: TaskStatus;
  priority: IssuePriority;
  dueDate: string | null;
};

export type StageChecklists = Record<string, StageChecklistItem[]>;

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
