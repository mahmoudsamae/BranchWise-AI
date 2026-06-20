"use client";

import { OPS_TIME_GROUPS, type OpsTimeGroup } from "@/lib/branch-ops/time-groups";

export type DailyItemDraft = { id?: string; label: string; time_group: OpsTimeGroup };

export function linesToDrafts(text: string, group: OpsTimeGroup): DailyItemDraft[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((label) => ({ label, time_group: group }));
}

export function draftsToLines(items: DailyItemDraft[], group: OpsTimeGroup): string {
  return items
    .filter((i) => i.time_group === group)
    .map((i) => i.label)
    .join("\n");
}

export function mergeGroupDrafts(
  morning: string,
  midday: string,
  evening: string,
  existing?: DailyItemDraft[],
): DailyItemDraft[] {
  const byGroup = (text: string, group: OpsTimeGroup) => {
    const newLabels = text.split("\n").map((l) => l.trim()).filter(Boolean);
    const oldInGroup = (existing ?? []).filter((i) => i.time_group === group);
    const remaining = [...oldInGroup];
    return newLabels.map((label) => {
      const matchIdx = remaining.findIndex((i) => i.label === label);
      const match = matchIdx >= 0 ? remaining.splice(matchIdx, 1)[0] : undefined;
      return {
        id: match?.id,
        label,
        time_group: group,
      };
    });
  };
  return [
    ...byGroup(morning, "morning"),
    ...byGroup(midday, "midday"),
    ...byGroup(evening, "evening"),
  ];
}

export function OpsDailyItemsEditor({
  morning,
  midday,
  evening,
  onMorningChange,
  onMiddayChange,
  onEveningChange,
}: {
  morning: string;
  midday: string;
  evening: string;
  onMorningChange: (v: string) => void;
  onMiddayChange: (v: string) => void;
  onEveningChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      {OPS_TIME_GROUPS.map((group) => {
        const value = group.id === "morning" ? morning : group.id === "midday" ? midday : evening;
        const onChange =
          group.id === "morning" ? onMorningChange : group.id === "midday" ? onMiddayChange : onEveningChange;
        return (
          <div key={group.id}>
            <label className="text-xs font-semibold tracking-wide text-[#9ca3af]">
              {group.label}
              {group.hint ? <span className="ml-2 font-normal text-[#6b7280]">({group.hint})</span> : null}
            </label>
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              rows={4}
              placeholder="Eine Aufgabe pro Zeile"
              className="mt-1.5 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
            />
          </div>
        );
      })}
    </div>
  );
}

export function itemsToGroupDrafts(
  items: { id: string; label: string; time_group?: string | null }[],
): { morning: string; midday: string; evening: string; drafts: DailyItemDraft[] } {
  const drafts: DailyItemDraft[] = items.map((i) => ({
    id: i.id,
    label: i.label,
    time_group: (i.time_group === "midday" || i.time_group === "evening" ? i.time_group : "morning") as OpsTimeGroup,
  }));
  return {
    morning: draftsToLines(drafts, "morning"),
    midday: draftsToLines(drafts, "midday"),
    evening: draftsToLines(drafts, "evening"),
    drafts,
  };
}
