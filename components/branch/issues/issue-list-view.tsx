"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Filter,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Target,
  Trash2,
} from "lucide-react";
import { Fragment, useMemo, useRef, useState, type ReactNode } from "react";

import { IssueListMenu, type ListMenuItem } from "@/components/branch/issues/issue-list-menu";
import { IssueTaskDetailPanel } from "@/components/branch/issues/issue-task-detail-panel";
import { PriorityBadge } from "@/components/branch/issues/issue-shared";
import { cn } from "@/lib/cn";
import { patchIssue, type StaffOption } from "@/lib/branch/issue-client";
import {
  deleteStage,
  duplicateStage,
  insertStageBelow,
  insertStageAtEnd,
  renameStage,
  setCurrentStage,
} from "@/lib/branch/issue-stage-mutations";
import {
  syncItemDone,
  type StageChecklistItem,
  type StageChecklists,
} from "@/lib/branch/issue-stage-data";
import {
  OWNER_FUNCTION_LABELS,
  PRIORITY_LABELS,
  type IssuePriority,
  type OwnerFunction,
} from "@/lib/branch/issue-types";
import { ownerFunctionSelectOptions, STAFF_ASSIGNEE_HINT } from "@/lib/branch/task-assignee";
import type { BranchIssue } from "@/lib/branch/problems";

const COL = {
  drag: "w-7",
  check: "w-9",
  name: "min-w-[260px]",
  assignee: "w-[148px]",
  due: "w-[128px]",
  owner: "w-[120px]",
  risk: "w-[108px]",
  menu: "w-9",
} as const;

function taskSortId(stageIndex: number, itemId: string) {
  return `task:${stageIndex}:${itemId}`;
}

function parseTaskSortId(id: string): { stageIndex: number; itemId: string } | null {
  const parts = id.split(":");
  if (parts.length !== 3 || parts[0] !== "task") return null;
  return { stageIndex: Number(parts[1]), itemId: parts[2]! };
}

function formatDueLabel(due: string | null): string {
  if (!due) return "";
  try {
    const d = new Date(`${due}T12:00:00`);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const fmt = new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" });
    if (d.toDateString() === today.toDateString()) return "Heute";
    return fmt.format(d);
  } catch {
    return due;
  }
}

function newTaskItem(text: string): StageChecklistItem {
  return {
    id: crypto.randomUUID(),
    text,
    done: false,
    status: "todo",
    priority: "medium",
    dueDate: null,
    assigneeId: null,
    assigneeName: null,
    ownerFunction: "rezeption",
    description: null,
    subtasks: [],
  };
}

function OwnerPill({ fn }: { fn: OwnerFunction }) {
  return (
    <span
      className={cn(
        "inline-flex rounded px-2 py-0.5 text-[11px] font-medium",
        fn === "rezeption" && "bg-sky-500/20 text-sky-200",
        fn === "sanitaer" && "bg-teal-500/20 text-teal-200",
        fn === "gruenpflege" && "bg-emerald-500/20 text-emerald-200",
        fn === "technik" && "bg-blue-500/20 text-blue-200",
        fn === "betrieb" && "bg-violet-500/20 text-violet-200",
        fn === "gastro" && "bg-orange-500/20 text-orange-200",
        fn === "gm_hq" && "bg-amber-500/20 text-amber-200",
        fn === "hr" && "bg-cyan-500/20 text-cyan-200",
        fn === "filiale" && "bg-[#3d3f44] text-[#d1d5db]",
      )}
    >
      {OWNER_FUNCTION_LABELS[fn]}
    </span>
  );
}

function PillSelect<T extends string>({
  value,
  options,
  onChange,
  renderPill,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  renderPill: (v: T) => ReactNode;
}) {
  return (
    <div className="relative inline-flex max-w-full">
      {renderPill(value)}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-label="Auswahl"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AssigneePicker({
  item,
  staff,
  onChange,
}: {
  item: StageChecklistItem;
  staff: StaffOption[];
  onChange: (assigneeId: string | null, assigneeName: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const name = item.assigneeName;
  const initial = name ? name.trim().charAt(0).toUpperCase() : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={STAFF_ASSIGNEE_HINT}
        aria-label={name ? `Mitarbeiter: ${name}` : "Mitarbeiter zuweisen"}
        className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1 hover:bg-[#2d2f33]"
      >
        {initial ? (
          <>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#4573d2] text-[10px] font-semibold text-white">
              {initial}
            </span>
            <span className="truncate text-xs text-[#e5e7eb]">{name}</span>
          </>
        ) : (
          <span className="flex size-6 items-center justify-center rounded-full border border-dashed border-[#4b5563] text-[#6b7280]">
            <Plus className="size-3" />
          </span>
        )}
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute left-0 top-full z-50 mt-1 max-h-56 w-56 overflow-y-auto rounded-lg border border-[#2d2f33] bg-[#252628] py-1 shadow-xl">
            <p className="border-b border-[#2d2f33] px-3 py-2 text-[10px] leading-snug text-[#6b7280]">
              {STAFF_ASSIGNEE_HINT}
            </p>
            <button
              type="button"
              onClick={() => {
                onChange(null, null);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-xs text-[#9ca3af] hover:bg-[#35363a]"
            >
              Nicht zugewiesen
            </button>
            {staff.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  onChange(s.id, s.full_name);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#f3f4f6] hover:bg-[#35363a]"
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-[#4573d2] text-[9px] font-semibold text-white">
                  {s.full_name.charAt(0).toUpperCase()}
                </span>
                {s.full_name}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function DueDateCell({
  dueDate,
  onChange,
}: {
  dueDate: string | null;
  onChange: (due: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const label = formatDueLabel(dueDate);

  if (editing) {
    return (
      <input
        autoFocus
        type="date"
        value={dueDate ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        onBlur={() => setEditing(false)}
        className="w-full rounded border border-[#4573d2] bg-[#1e1f21] px-1 py-1 text-xs text-white focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full rounded-md px-1 py-1 text-left text-xs text-[#9ca3af] hover:bg-[#2d2f33] hover:text-[#e5e7eb]"
    >
      {label || "—"}
    </button>
  );
}

function SortableTaskRow({
  item,
  stageIndex,
  staff,
  dragDisabled,
  readOnly,
  canMutateTaskList,
  onUpdate,
  onDelete,
  onOpenDetails,
}: {
  item: StageChecklistItem;
  stageIndex: number;
  staff: StaffOption[];
  dragDisabled: boolean;
  readOnly?: boolean;
  canMutateTaskList: boolean;
  onUpdate: (stageIndex: number, itemId: string, patch: Partial<StageChecklistItem>) => void;
  onDelete: (stageIndex: number, itemId: string) => void;
  onOpenDetails: () => void;
}) {
  const completed = item.status === "completed";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.text);
  const [menuOpen, setMenuOpen] = useState(false);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: taskSortId(stageIndex, item.id),
    disabled: dragDisabled || readOnly || !canMutateTaskList,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  function commitTitle() {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== item.text) onUpdate(stageIndex, item.id, { text: next });
    else setDraft(item.text);
  }

  const taskMenu: ListMenuItem[] = [
    {
      id: "details",
      label: "Details öffnen",
      icon: <ChevronRight className="size-3.5" />,
      onClick: onOpenDetails,
    },
    ...(readOnly || !canMutateTaskList
      ? []
      : [
          {
            id: "rename",
            label: "Aufgabe umbenennen",
            icon: <Pencil className="size-3.5" />,
            onClick: () => setEditing(true),
          },
          {
            id: "delete",
            label: "Aufgabe löschen",
            icon: <Trash2 className="size-3.5" />,
            danger: true,
            onClick: () => onDelete(stageIndex, item.id),
          },
        ]),
  ];

  return (
    <tr ref={setNodeRef} style={style} className="group/task border-b border-[#2d2f33]/80 hover:bg-[#252628]">
      <td className={cn(COL.drag, "px-1 py-2 align-middle")}>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          disabled={dragDisabled || readOnly || !canMutateTaskList}
          className={cn(
            "rounded p-0.5 text-[#6b7280] opacity-0 transition hover:text-[#e5e7eb] group-hover/task:opacity-100",
            (dragDisabled || readOnly || !canMutateTaskList) && "hidden",
          )}
          aria-label="Ziehen zum Sortieren"
        >
          <GripVertical className="size-4" />
        </button>
      </td>
      <td className={cn(COL.check, "px-1 py-2 align-middle")}>
        <button
          type="button"
          disabled={readOnly}
          onClick={() =>
            !readOnly &&
            onUpdate(stageIndex, item.id, {
              status: completed ? "todo" : "completed",
              done: !completed,
            })
          }
          className={cn(
            "flex size-[18px] items-center justify-center rounded-full border-2 transition",
            completed ? "border-[#4573d2] bg-[#4573d2]" : "border-[#6b7280] hover:border-[#9ca3af]",
          )}
          aria-label={completed ? "Als offen markieren" : "Als erledigt markieren"}
        >
          {completed ? <span className="size-2 rounded-full bg-white" /> : null}
        </button>
      </td>
      <td className={cn(COL.name, "px-2 py-2 align-middle")}>
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onOpenDetails}
            className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[11px] text-[#9ca3af] opacity-0 transition hover:bg-[#35363a] hover:text-white group-hover/task:opacity-100"
          >
            <ChevronRight className="size-3.5" />
            Details
          </button>
          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitTitle();
                if (e.key === "Escape") {
                  setDraft(item.text);
                  setEditing(false);
                }
              }}
              className="min-w-0 flex-1 rounded border border-[#4573d2] bg-[#1e1f21] px-2 py-1 text-sm text-white focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => !readOnly && canMutateTaskList && setEditing(true)}
              disabled={readOnly || !canMutateTaskList}
              className={cn(
                "min-w-0 flex-1 truncate text-left text-sm text-[#f3f4f6]",
                completed && "text-[#6b7280] line-through",
                (readOnly || !canMutateTaskList) && "cursor-default",
              )}
            >
              {item.text}
              {item.subtasks.length > 0 ? (
                <span className="ml-2 text-[10px] text-[#6b7280]">
                  {item.subtasks.filter((s) => s.done).length}/{item.subtasks.length}
                </span>
              ) : null}
            </button>
          )}
        </div>
      </td>
      <td className={cn(COL.assignee, "px-2 py-2 align-middle")}>
        <AssigneePicker
          item={item}
          staff={staff}
          onChange={(assigneeId, assigneeName) =>
            !readOnly && onUpdate(stageIndex, item.id, { assigneeId, assigneeName })
          }
        />
      </td>
      <td className={cn(COL.due, "px-2 py-2 align-middle")}>
        <DueDateCell
          dueDate={item.dueDate}
          onChange={(dueDate) => !readOnly && onUpdate(stageIndex, item.id, { dueDate })}
        />
      </td>
      <td className={cn(COL.owner, "px-2 py-2 align-middle")}>
        <PillSelect
          value={item.ownerFunction}
          options={ownerFunctionSelectOptions()}
          onChange={(ownerFunction) => !readOnly && onUpdate(stageIndex, item.id, { ownerFunction })}
          renderPill={(fn) => <OwnerPill fn={fn} />}
        />
      </td>
      <td className={cn(COL.risk, "px-2 py-2 align-middle")}>
        <PillSelect
          value={item.priority}
          options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
            value: value as IssuePriority,
            label,
          }))}
          onChange={(priority) => !readOnly && onUpdate(stageIndex, item.id, { priority })}
          renderPill={(p) => <PriorityBadge priority={p} />}
        />
      </td>
      <td className={cn(COL.menu, "relative px-1 py-2 align-middle")}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded p-1 text-[#6b7280] opacity-0 transition hover:bg-[#35363a] hover:text-white group-hover/task:opacity-100"
          aria-label="Aufgabenmenü"
        >
          <MoreHorizontal className="size-4" />
        </button>
        {menuOpen ? (
          <IssueListMenu items={taskMenu} onClose={() => setMenuOpen(false)} className="right-0 top-7" />
        ) : null}
      </td>
    </tr>
  );
}

function TaskRowPreview({ item }: { item: StageChecklistItem }) {
  return (
    <div className="rounded-lg border border-[#4573d2]/40 bg-[#252628] px-4 py-2 shadow-lg">
      <p className="text-sm text-white">{item.text}</p>
    </div>
  );
}

function SectionHeaderRow({
  stageName,
  isCurrent,
  isOpen,
  taskDone,
  taskTotal,
  canDelete,
  canManage,
  onToggle,
  onRename,
  onMenuAction,
}: {
  stageName: string;
  isCurrent: boolean;
  isOpen: boolean;
  taskDone: number;
  taskTotal: number;
  canDelete: boolean;
  canManage: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onMenuAction: (action: SectionAction) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(stageName);
  const [menuOpen, setMenuOpen] = useState(false);

  function commitRename() {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== stageName) onRename(next);
    else setDraft(stageName);
  }

  const menuItems: ListMenuItem[] = canManage
    ? [
    {
      id: "rename",
      label: "Abschnitt umbenennen",
      icon: <Pencil className="size-3.5" />,
      onClick: () => {
        setDraft(stageName);
        setEditing(true);
      },
    },
    {
      id: "add-task",
      label: "Aufgabe hinzufügen",
      icon: <Plus className="size-3.5" />,
      onClick: () => onMenuAction("add-task"),
    },
    {
      id: "add-section",
      label: "Abschnitt hinzufügen",
      icon: <Plus className="size-3.5" />,
      onClick: () => onMenuAction("add-section-below"),
    },
    {
      id: "duplicate",
      label: "Abschnitt duplizieren",
      icon: <Copy className="size-3.5" />,
      onClick: () => onMenuAction("duplicate"),
    },
    { id: "sep1", label: "", onClick: () => {}, separator: true },
    {
      id: "current",
      label: "Als aktuelle Phase markieren",
      icon: <Target className="size-3.5" />,
      onClick: () => onMenuAction("set-current"),
      disabled: isCurrent,
    },
    { id: "sep2", label: "", onClick: () => {}, separator: true },
    {
      id: "collapse",
      label: isOpen ? "Abschnitt einklappen" : "Abschnitt ausklappen",
      icon: isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />,
      onClick: () => onToggle(),
    },
    { id: "sep3", label: "", onClick: () => {}, separator: true },
    {
      id: "delete",
      label: "Abschnitt löschen",
      icon: <Trash2 className="size-3.5" />,
      danger: true,
      disabled: !canDelete,
      onClick: () => onMenuAction("delete"),
    },
  ]
    : [
        {
          id: "collapse",
          label: isOpen ? "Abschnitt einklappen" : "Abschnitt ausklappen",
          icon: isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />,
          onClick: () => onToggle(),
        },
      ];

  return (
    <tr className="group/section border-b border-[#2d2f33] bg-[#1e1f21]">
      <td colSpan={8} className="p-0">
        <div className="flex items-center gap-1 px-2 py-2 hover:bg-[#252628]">
          <button type="button" onClick={onToggle} className="rounded p-0.5 text-[#9ca3af] hover:text-white">
            {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>

          {editing ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraft(stageName);
                  setEditing(false);
                }
              }}
              className="min-w-[160px] rounded border border-[#4573d2] bg-[#252628] px-2 py-0.5 text-sm font-semibold text-white focus:outline-none"
            />
          ) : canManage ? (
            <button
              type="button"
              onClick={() => {
                setDraft(stageName);
                setEditing(true);
              }}
              className={cn(
                "text-sm font-semibold hover:underline",
                isCurrent ? "text-[#fbbf24]" : "text-[#f3f4f6]",
              )}
            >
              {stageName}
            </button>
          ) : (
            <span className={cn("text-sm font-semibold", isCurrent ? "text-[#fbbf24]" : "text-[#f3f4f6]")}>
              {stageName}
            </span>
          )}

          <span className="text-xs text-[#6b7280]">
            {taskDone}/{taskTotal}
          </span>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="rounded p-1 text-[#9ca3af] opacity-0 transition hover:bg-[#35363a] hover:text-white group-hover/section:opacity-100"
              aria-label="Abschnittsmenü"
            >
              <MoreHorizontal className="size-4" />
            </button>
            {menuOpen ? (
              <IssueListMenu items={menuItems} onClose={() => setMenuOpen(false)} className="left-0 top-7" />
            ) : null}
          </div>
        </div>
      </td>
    </tr>
  );
}

type SectionAction = "add-task" | "add-section-below" | "duplicate" | "set-current" | "delete";
type DetailTarget = { stageIndex: number; itemId: string };

export function IssueListView({
  issue,
  staff,
  onUpdated,
  readOnly: readOnlyProp,
}: {
  issue: BranchIssue;
  staff: StaffOption[];
  onUpdated: (issue: BranchIssue) => void;
  readOnly?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<IssuePriority | "all">("all");
  const [hideEmpty, setHideEmpty] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [detailTarget, setDetailTarget] = useState<DetailTarget | null>(null);
  const [activeDragItem, setActiveDragItem] = useState<StageChecklistItem | null>(null);
  const addTaskRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const dragDisabled = Boolean(search.trim()) || priorityFilter !== "all";
  const readOnly = readOnlyProp ?? !issue.canEditTasks;
  const canMutateTaskList = issue.canMutateTaskList;
  const canManage = issue.canManage;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function persist(patch: Record<string, unknown>, action?: string) {
    setSaving(true);
    try {
      const updated = await patchIssue(issue.id, {
        ...patch,
        ...(action ? { activityAction: action } : {}),
      });
      onUpdated(updated);
    } finally {
      setSaving(false);
    }
  }

  async function persistChecklists(next: StageChecklists, action?: string) {
    if (!issue.canEditTasks) return;
    await persist({ stageChecklists: next }, action);
  }

  async function persistStagePatch(
    patch: ReturnType<typeof renameStage>,
    action: string,
    detail?: string,
  ) {
    if (!canMutateTaskList) return;
    await persist(
      {
        stages: patch.stages,
        stageChecklists: patch.stageChecklists,
        stageNotes: patch.stageNotes,
        stageDueDates: patch.stageDueDates,
        currentStage: patch.currentStage,
        ...(detail ? { activityDetail: detail } : {}),
      },
      action,
    );
  }

  function isSectionOpen(stageIndex: number) {
    return collapsed[stageIndex] !== true;
  }

  function toggleSection(stageIndex: number) {
    setCollapsed((prev) => ({ ...prev, [stageIndex]: isSectionOpen(stageIndex) }));
  }

  function collapseAll() {
    const next: Record<number, boolean> = {};
    issue.stages.forEach((_, i) => {
      next[i] = true;
    });
    setCollapsed(next);
  }

  function expandAll() {
    setCollapsed({});
  }

  function updateItem(stageIndex: number, itemId: string, patch: Partial<StageChecklistItem>) {
    if (!issue.canEditTasks) return;
    const key = String(stageIndex);
    const list = [...(issue.stageChecklists[key] ?? [])];
    const idx = list.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    list[idx] = syncItemDone({ ...list[idx]!, ...patch });
    void persistChecklists({ ...issue.stageChecklists, [key]: list }, "Aufgabe aktualisiert");
  }

  function deleteItem(stageIndex: number, itemId: string) {
    if (!canMutateTaskList) return;
    const key = String(stageIndex);
    const list = (issue.stageChecklists[key] ?? []).filter((i) => i.id !== itemId);
    void persistChecklists({ ...issue.stageChecklists, [key]: list }, "Aufgabe gelöscht");
    if (detailTarget?.stageIndex === stageIndex && detailTarget.itemId === itemId) {
      setDetailTarget(null);
    }
  }

  function addTask(stageIndex: number, text: string) {
    if (!canMutateTaskList) return;
    const key = String(stageIndex);
    void persistChecklists(
      { ...issue.stageChecklists, [key]: [...(issue.stageChecklists[key] ?? []), newTaskItem(text)] },
      "Aufgabe hinzugefügt",
    );
  }

  function handleDragStart(event: DragStartEvent) {
    const parsed = parseTaskSortId(String(event.active.id));
    if (!parsed) return;
    const item = issue.stageChecklists[String(parsed.stageIndex)]?.find((i) => i.id === parsed.itemId);
    if (item) setActiveDragItem(item);
  }

  function handleDragEnd(event: DragEndEvent) {
    if (!canMutateTaskList) return;
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = parseTaskSortId(String(active.id));
    const to = parseTaskSortId(String(over.id));
    if (!from || !to) return;

    const fromKey = String(from.stageIndex);
    const toKey = String(to.stageIndex);

    if (from.stageIndex === to.stageIndex) {
      const list = [...(issue.stageChecklists[fromKey] ?? [])];
      const oldIndex = list.findIndex((i) => i.id === from.itemId);
      const newIndex = list.findIndex((i) => i.id === to.itemId);
      if (oldIndex < 0 || newIndex < 0) return;
      void persistChecklists(
        { ...issue.stageChecklists, [fromKey]: arrayMove(list, oldIndex, newIndex) },
        "Reihenfolge geändert",
      );
      return;
    }

    const fromList = [...(issue.stageChecklists[fromKey] ?? [])];
    const toList = [...(issue.stageChecklists[toKey] ?? [])];
    const itemIdx = fromList.findIndex((i) => i.id === from.itemId);
    if (itemIdx < 0) return;
    const [moved] = fromList.splice(itemIdx, 1);
    if (!moved) return;
    const insertAt = toList.findIndex((i) => i.id === to.itemId);
    toList.splice(insertAt >= 0 ? insertAt : toList.length, 0, moved);
    void persistChecklists(
      { ...issue.stageChecklists, [fromKey]: fromList, [toKey]: toList },
      "Aufgabe verschoben",
    );
  }

  function handleSectionAction(stageIndex: number, action: SectionAction) {
    switch (action) {
      case "add-task":
        setCollapsed((prev) => ({ ...prev, [stageIndex]: false }));
        setTimeout(() => addTaskRefs.current[stageIndex]?.focus(), 0);
        break;
      case "add-section-below":
        void persistStagePatch(insertStageBelow(issue, stageIndex), "Abschnitt hinzugefügt");
        break;
      case "duplicate":
        void persistStagePatch(duplicateStage(issue, stageIndex), "Abschnitt dupliziert", issue.stages[stageIndex]);
        break;
      case "set-current":
        void persistStagePatch(setCurrentStage(issue, stageIndex), "Phase gewechselt", issue.stages[stageIndex]);
        break;
      case "delete": {
        const patch = deleteStage(issue, stageIndex);
        if (patch) void persistStagePatch(patch, "Abschnitt gelöscht", issue.stages[stageIndex]);
        break;
      }
    }
  }

  function renameSection(stageIndex: number, name: string) {
    void persistStagePatch(renameStage(issue, stageIndex, name), "Abschnitt umbenannt", name);
  }

  function addSectionAtEnd(name: string) {
    if (!canMutateTaskList) return;
    const trimmed = name.trim() || "Neuer Abschnitt";
    void persistStagePatch(insertStageAtEnd(issue, trimmed), "Abschnitt hinzugefügt", trimmed);
    setAddingSection(false);
    setNewSectionName("");
  }

  const visibleStages = useMemo(() => {
    return issue.stages
      .map((name, stageIndex) => {
        let items = issue.stageChecklists[String(stageIndex)] ?? [];
        const totalItems = items.length;
        if (search.trim()) {
          const q = search.toLowerCase();
          items = items.filter((i) => i.text.toLowerCase().includes(q));
        }
        if (priorityFilter !== "all") {
          items = items.filter((i) => i.priority === priorityFilter);
        }
        const done = (issue.stageChecklists[String(stageIndex)] ?? []).filter(
          (i) => i.status === "completed",
        ).length;
        return {
          stageIndex,
          name,
          items,
          totalItems,
          done,
          isCurrent: stageIndex === issue.currentStage,
          hiddenByEmpty: hideEmpty && totalItems === 0,
        };
      })
      .filter((s) => !s.hiddenByEmpty);
  }, [issue, search, priorityFilter, hideEmpty]);

  const detailItem = detailTarget
    ? issue.stageChecklists[String(detailTarget.stageIndex)]?.find((i) => i.id === detailTarget.itemId) ?? null
    : null;

  const detailStageName = detailTarget ? issue.stages[detailTarget.stageIndex] ?? "" : "";

  const allCollapsed = issue.stages.length > 0 && issue.stages.every((_, i) => collapsed[i] === true);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#1e1f21]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2d2f33] px-4 py-3">
        <button
          type="button"
          disabled={readOnly || !canMutateTaskList}
          onClick={() => addTask(issue.currentStage, "Neue Aufgabe")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md bg-[#4573d2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#3a63b8]",
            (readOnly || !canMutateTaskList) && "cursor-not-allowed opacity-50",
          )}
        >
          <Plus className="size-4" /> Aufgabe
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#6b7280]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Aufgaben suchen…"
              className="rounded-md border border-[#3d3f44] bg-[#252628] py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-[#6b7280] focus:border-[#4573d2] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-[#3d3f44] px-2 py-1.5 text-xs text-[#9ca3af]">
            <Filter className="size-3.5" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as IssuePriority | "all")}
              className="bg-transparent text-xs focus:outline-none"
            >
              <option value="all">Alle Risiken</option>
              <option value="low">Niedrig</option>
              <option value="medium">Mittel</option>
              <option value="high">Hoch</option>
              <option value="critical">Kritisch</option>
            </select>
          </div>
          <button
            type="button"
            onClick={() => (allCollapsed ? expandAll() : collapseAll())}
            className="rounded-md border border-[#3d3f44] px-2.5 py-1.5 text-xs text-[#9ca3af] hover:text-white"
          >
            {allCollapsed ? "Alle ausklappen" : "Alle einklappen"}
          </button>
          <button
            type="button"
            onClick={() => setHideEmpty((v) => !v)}
            className={cn(
              "rounded-md border px-2.5 py-1.5 text-xs",
              hideEmpty ? "border-[#4573d2] text-[#93c5fd]" : "border-[#3d3f44] text-[#9ca3af] hover:text-white",
            )}
          >
            Leere ausblenden
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-[#3d3f44] px-2.5 py-1.5 text-xs text-[#9ca3af]"
          >
            <SlidersHorizontal className="size-3.5" /> Optionen
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[980px] border-collapse">
            <thead className="sticky top-0 z-10 bg-[#1e1f21]">
              <tr className="border-b border-[#2d2f33] text-left text-[11px] font-medium uppercase tracking-wide text-[#6b7280]">
                <th className={cn(COL.drag, "px-1 py-2.5")} />
                <th className={cn(COL.check, "px-1 py-2.5")} />
                <th className={cn(COL.name, "px-2 py-2.5")}>Name</th>
                <th className={cn(COL.assignee, "px-2 py-2.5")} title={STAFF_ASSIGNEE_HINT}>
                  Mitarbeiter
                </th>
                <th className={cn(COL.due, "px-2 py-2.5")}>Fällig</th>
                <th className={cn(COL.owner, "px-2 py-2.5")}>Bereich</th>
                <th className={cn(COL.risk, "px-2 py-2.5")}>Risiko</th>
                <th className={cn(COL.menu, "px-1 py-2.5")} />
              </tr>
            </thead>
            <tbody>
              {visibleStages.map(({ stageIndex, name, items, done, totalItems, isCurrent }) => {
                const open = isSectionOpen(stageIndex);
                const sortIds = items.map((i) => taskSortId(stageIndex, i.id));
                return (
                  <Fragment key={stageIndex}>
                    <SectionHeaderRow
                      stageName={name}
                      isCurrent={isCurrent}
                      isOpen={open}
                      taskDone={done}
                      taskTotal={totalItems}
                      canDelete={issue.stages.length > 1}
                      canManage={canManage}
                      onToggle={() => toggleSection(stageIndex)}
                      onRename={(next) => renameSection(stageIndex, next)}
                      onMenuAction={(action) => handleSectionAction(stageIndex, action)}
                    />
                    {open ? (
                      <>
                        <SortableContext items={sortIds} strategy={verticalListSortingStrategy}>
                          {items.map((item) => (
                            <SortableTaskRow
                              key={item.id}
                              item={item}
                              stageIndex={stageIndex}
                              staff={staff}
                              dragDisabled={dragDisabled}
                              readOnly={readOnly}
                              canMutateTaskList={canMutateTaskList}
                              onUpdate={updateItem}
                              onDelete={deleteItem}
                              onOpenDetails={() => setDetailTarget({ stageIndex, itemId: item.id })}
                            />
                          ))}
                        </SortableContext>
                        <tr className="border-b border-[#2d2f33]/60">
                          <td className={COL.drag} />
                          <td className={COL.check} />
                          <td colSpan={6} className="px-2 py-1.5">
                            {!readOnly && canMutateTaskList ? (
                            <div className="flex items-center gap-2 pl-1">
                              <Plus className="size-3.5 text-[#6b7280]" />
                              <input
                                ref={(el) => {
                                  addTaskRefs.current[stageIndex] = el;
                                }}
                                placeholder="Aufgabe hinzufügen…"
                                className="min-w-0 flex-1 bg-transparent text-sm text-[#e5e7eb] placeholder:text-[#6b7280] focus:outline-none"
                                onKeyDown={(e) => {
                                  const input = e.currentTarget;
                                  if (e.key === "Enter" && input.value.trim()) {
                                    addTask(stageIndex, input.value.trim());
                                    input.value = "";
                                  }
                                }}
                              />
                            </div>
                            ) : null}
                          </td>
                        </tr>
                      </>
                    ) : null}
                  </Fragment>
                );
              })}

              <tr>
                <td colSpan={8} className="px-3 py-3">
                  {canMutateTaskList ? (
                  addingSection ? (
                    <div className="flex items-center gap-2">
                      <Plus className="size-3.5 text-[#6b7280]" />
                      <input
                        autoFocus
                        value={newSectionName}
                        onChange={(e) => setNewSectionName(e.target.value)}
                        placeholder="Abschnittsname…"
                        className="min-w-[200px] bg-transparent text-sm text-white placeholder:text-[#6b7280] focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") addSectionAtEnd(newSectionName);
                          if (e.key === "Escape") {
                            setAddingSection(false);
                            setNewSectionName("");
                          }
                        }}
                        onBlur={() => {
                          if (newSectionName.trim()) addSectionAtEnd(newSectionName);
                          else setAddingSection(false);
                        }}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingSection(true)}
                      className="inline-flex items-center gap-1.5 text-sm text-[#9ca3af] hover:text-white"
                    >
                      <Plus className="size-4" /> Abschnitt hinzufügen
                    </button>
                  )
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <DragOverlay>{activeDragItem ? <TaskRowPreview item={activeDragItem} /> : null}</DragOverlay>
      </DndContext>

      {saving ? <p className="border-t border-[#2d2f33] px-4 py-2 text-xs text-[#6b7280]">Speichern…</p> : null}

      {detailItem && detailTarget ? (
        <IssueTaskDetailPanel
          item={detailItem}
          stageName={detailStageName}
          staff={staff}
          onUpdate={(patch) => updateItem(detailTarget.stageIndex, detailTarget.itemId, patch)}
          onClose={() => setDetailTarget(null)}
        />
      ) : null}
    </div>
  );
}
