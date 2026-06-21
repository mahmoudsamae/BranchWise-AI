"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";

import { PriorityBadge } from "@/components/branch/issues/issue-shared";
import { cn } from "@/lib/cn";
import { flattenIssueTasks } from "@/lib/branch/issue-metrics";
import { syncItemDone, type StageChecklistItem, type StageChecklists } from "@/lib/branch/issue-stage-data";
import { TASK_COLUMNS, TASK_STATUS_LABELS, type TaskStatus } from "@/lib/branch/issue-types";
import type { BranchIssue } from "@/lib/branch/problems";

function TaskCard({ task }: { task: ReturnType<typeof flattenIssueTasks>[number] }) {
  return (
    <div className="rounded-lg border border-[#374151] bg-[#111827] p-3 shadow-sm">
      <p className="text-sm text-[#f3f4f6]">{task.text}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <PriorityBadge priority={task.priority} />
        <span className="text-[10px] text-[#6b7280]">{task.stageName}</span>
        {task.dueDate ? <span className="text-[10px] text-amber-300">bis {task.dueDate}</span> : null}
      </div>
    </div>
  );
}

function DraggableTask({ task }: { task: ReturnType<typeof flattenIssueTasks>[number] }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `${task.stageIndex}:${task.itemId}`,
    data: task,
  });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={cn(isDragging && "opacity-40")}>
      <TaskCard task={task} />
    </div>
  );
}

function Column({
  status,
  tasks,
  readOnly,
}: {
  status: TaskStatus;
  tasks: ReturnType<typeof flattenIssueTasks>;
  readOnly?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status, disabled: readOnly });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[280px] flex-col rounded-xl border bg-[#0a0f1e]/60 p-3",
        isOver ? "border-indigo-500/50" : "border-[#1f2937]",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">{TASK_STATUS_LABELS[status]}</p>
        <span className="text-[10px] text-[#6b7280]">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) =>
          readOnly ? (
            <TaskCard key={`${task.stageIndex}:${task.itemId}`} task={task} />
          ) : (
            <DraggableTask key={`${task.stageIndex}:${task.itemId}`} task={task} />
          ),
        )}
      </div>
    </div>
  );
}

export function IssueKanbanBoard({
  issue,
  onChecklistsChange,
  readOnly = false,
}: {
  issue: BranchIssue;
  onChecklistsChange?: (next: StageChecklists) => Promise<void>;
  readOnly?: boolean;
}) {
  const tasks = useMemo(() => flattenIssueTasks(issue), [issue]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const map: Record<TaskStatus, ReturnType<typeof flattenIssueTasks>> = {
      todo: [],
      in_progress: [],
      review: [],
      completed: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  const activeTask = tasks.find((t) => `${t.stageIndex}:${t.itemId}` === activeId) ?? null;

  async function moveTask(stageIndex: number, itemId: string, status: TaskStatus) {
    if (readOnly || !onChecklistsChange) return;
    const key = String(stageIndex);
    const list = [...(issue.stageChecklists[key] ?? [])];
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const updated: StageChecklistItem = syncItemDone({ ...list[idx]!, status, done: status === "completed" });
    list[idx] = updated;
    await onChecklistsChange({ ...issue.stageChecklists, [key]: list });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId || !TASK_COLUMNS.includes(overId as TaskStatus)) return;
    const data = e.active.data.current as ReturnType<typeof flattenIssueTasks>[number] | undefined;
    if (!data) return;
    if (data.status === overId) return;
    await moveTask(data.stageIndex, data.itemId, overId as TaskStatus);
  }

  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#374151] p-6 text-center text-sm text-[#6b7280]">
        Noch keine Aufgaben — füge sie in den Phasen hinzu.
      </p>
    );
  }

  if (readOnly) {
    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TASK_COLUMNS.map((status) => (
          <Column key={status} status={status} tasks={grouped[status]} readOnly />
        ))}
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={(e) => void onDragEnd(e)}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {TASK_COLUMNS.map((status) => (
          <Column key={status} status={status} tasks={grouped[status]} />
        ))}
      </div>
      <DragOverlay>{activeTask ? <TaskCard task={activeTask} /> : null}</DragOverlay>
    </DndContext>
  );
}
