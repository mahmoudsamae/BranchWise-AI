"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { OPS_TIME_GROUPS, type OpsTimeGroup } from "@/lib/branch-ops/time-groups";

export type DailyItemDraft = { id?: string; label: string; time_group: OpsTimeGroup };

function linesToItems(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function itemsToLines(items: string[]): string {
  return items.join("\n");
}

export function linesToDrafts(text: string, group: OpsTimeGroup): DailyItemDraft[] {
  return linesToItems(text).map((label) => ({ label, time_group: group }));
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
    const newLabels = linesToItems(text);
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
  return [...byGroup(morning, "morning"), ...byGroup(midday, "midday"), ...byGroup(evening, "evening")];
}

function SortableDailyItemRow({
  id,
  label,
  onLabelChange,
  onRemove,
}: {
  id: string;
  label: string;
  onLabelChange: (label: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border border-[#1f2937] bg-[#0a0f1e]/60 px-2 py-1.5"
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none rounded p-1 text-[#6b7280] hover:text-white active:cursor-grabbing"
        aria-label="Reihenfolge ändern"
      >
        <GripVertical className="size-4" />
      </button>
      <input
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-1 text-sm text-white focus:border-[#374151] focus:bg-[#111827]"
        placeholder="Aufgabe…"
      />
      <button
        type="button"
        onClick={onRemove}
        className="rounded p-1 text-[#6b7280] hover:text-red-400"
        aria-label="Entfernen"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function SortableDailyGroup({
  groupId,
  groupLabel,
  hint,
  value,
  onChange,
}: {
  groupId: OpsTimeGroup;
  groupLabel: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const items = linesToItems(value);
  const sortIds = items.map((_, i) => `${groupId}:${i}`);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function setItems(next: string[]) {
    onChange(itemsToLines(next));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sortIds.indexOf(String(active.id));
    const newIndex = sortIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    setItems(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-semibold tracking-wide text-[#9ca3af]">
          {groupLabel}
          {hint ? <span className="ml-2 font-normal text-[#6b7280]">({hint})</span> : null}
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setItems([...items, "Neue Aufgabe"])}
        >
          <Plus className="size-3.5" /> Aufgabe
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="mt-2 text-xs text-[#6b7280]">Noch keine Aufgaben — „Aufgabe“ hinzufügen oder per Drag & Drop sortieren.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
            <ul className={cn("mt-2 space-y-2", items.length > 0 && "min-h-[2rem]")}>
              {items.map((label, i) => (
                <li key={sortIds[i]}>
                  <SortableDailyItemRow
                    id={sortIds[i]!}
                    label={label}
                    onLabelChange={(next) => {
                      const copy = [...items];
                      copy[i] = next;
                      setItems(copy);
                    }}
                    onRemove={() => setItems(items.filter((_, j) => j !== i))}
                  />
                </li>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
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
    <div className="space-y-5">
      <p className="text-xs text-[#6b7280]">Aufgaben per Griff ziehen, um die Reihenfolge zu ändern.</p>
      {OPS_TIME_GROUPS.map((group) => {
        const value = group.id === "morning" ? morning : group.id === "midday" ? midday : evening;
        const onChange =
          group.id === "morning" ? onMorningChange : group.id === "midday" ? onMiddayChange : onEveningChange;
        return (
          <SortableDailyGroup
            key={group.id}
            groupId={group.id}
            groupLabel={group.label}
            hint={group.hint}
            value={value}
            onChange={onChange}
          />
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
