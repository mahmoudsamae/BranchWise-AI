export type StageChecklistItem = {
  id: string;
  text: string;
  done: boolean;
};

export type StageChecklists = Record<string, StageChecklistItem[]>;

export function parseStageChecklists(raw: unknown): StageChecklists {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: StageChecklists = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(v)) continue;
    const items: StageChecklistItem[] = [];
    for (const row of v) {
      if (!row || typeof row !== "object") continue;
      const r = row as Record<string, unknown>;
      const text = String(r.text ?? "").trim();
      if (!text) continue;
      items.push({
        id: String(r.id ?? text),
        text,
        done: Boolean(r.done),
      });
    }
    if (items.length) out[k] = items;
  }
  return out;
}

export function checklistStats(items: StageChecklistItem[] | undefined): { done: number; total: number } {
  const list = items ?? [];
  return { done: list.filter((i) => i.done).length, total: list.length };
}

export function stageStatus(
  index: number,
  currentStage: number,
): "done" | "current" | "upcoming" {
  if (index < currentStage) return "done";
  if (index === currentStage) return "current";
  return "upcoming";
}
