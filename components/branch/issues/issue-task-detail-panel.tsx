"use client";

import { Plus, X } from "lucide-react";
import { useEffect, useState } from "react";

import { PriorityBadge, WorkflowBadge } from "@/components/branch/issues/issue-shared";
import { cn } from "@/lib/cn";
import type { StaffOption } from "@/lib/branch/issue-client";
import type { StageChecklistItem, TaskSubtask } from "@/lib/branch/issue-stage-data";
import {
  OWNER_FUNCTION_LABELS,
  PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type IssuePriority,
  type OwnerFunction,
  type TaskStatus,
} from "@/lib/branch/issue-types";
import {
  OWNER_FUNCTION_HINT,
  ownerFunctionSelectOptions,
  STAFF_ASSIGNEE_HINT,
} from "@/lib/branch/task-assignee";

export function IssueTaskDetailPanel({
  item,
  stageName,
  staff,
  onUpdate,
  onClose,
}: {
  item: StageChecklistItem;
  stageName: string;
  staff: StaffOption[];
  onUpdate: (patch: Partial<StageChecklistItem>) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(item);

  useEffect(() => {
    setDraft(item);
  }, [item]);

  function patch(p: Partial<StageChecklistItem>) {
    const next = { ...draft, ...p };
    setDraft(next);
    onUpdate(p);
  }

  function addSubtask(text: string) {
    const sub: TaskSubtask = { id: crypto.randomUUID(), text, done: false };
    patch({ subtasks: [...draft.subtasks, sub] });
  }

  function toggleSubtask(id: string) {
    patch({
      subtasks: draft.subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)),
    });
  }

  function removeSubtask(id: string) {
    patch({ subtasks: draft.subtasks.filter((s) => s.id !== id) });
  }

  const completed = draft.status === "completed";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose} aria-hidden />
      <div
        className="fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-[#2d2f33] bg-[#252628] shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#2d2f33] px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wide text-[#6b7280]">{stageName}</p>
            <input
              id="task-detail-title"
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              onBlur={() => {
                const t = draft.text.trim();
                if (t && t !== item.text) patch({ text: t });
              }}
              className="mt-1 w-full bg-transparent text-lg font-semibold text-white focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#9ca3af] hover:bg-[#35363a] hover:text-white"
            aria-label="Schließen"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#e5e7eb]">
            <input
              type="checkbox"
              checked={completed}
              onChange={() =>
                patch({
                  status: completed ? "todo" : "completed",
                  done: !completed,
                })
              }
              className="size-4 rounded-full accent-[#4573d2]"
            />
            Als erledigt markieren
          </label>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field label="Status">
              <select
                value={draft.status}
                onChange={(e) => patch({ status: e.target.value as TaskStatus })}
                className="w-full rounded-lg border border-[#3d3f44] bg-[#1e1f21] px-2 py-1.5 text-sm text-white"
              >
                {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Mitarbeiter" hint={STAFF_ASSIGNEE_HINT}>
              <select
                value={draft.assigneeId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  const name = id ? staff.find((s) => s.id === id)?.full_name ?? null : null;
                  patch({ assigneeId: id, assigneeName: name });
                }}
                className="w-full rounded-lg border border-[#3d3f44] bg-[#1e1f21] px-2 py-1.5 text-sm text-white"
              >
                <option value="">Nicht zugewiesen</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Fällig">
              <input
                type="date"
                value={draft.dueDate ?? ""}
                onChange={(e) => patch({ dueDate: e.target.value || null })}
                className="w-full rounded-lg border border-[#3d3f44] bg-[#1e1f21] px-2 py-1.5 text-sm text-white"
              />
            </Field>

            <Field label="Bereich" hint={OWNER_FUNCTION_HINT}>
              <select
                value={draft.ownerFunction}
                onChange={(e) => patch({ ownerFunction: e.target.value as OwnerFunction })}
                className="w-full rounded-lg border border-[#3d3f44] bg-[#1e1f21] px-2 py-1.5 text-sm text-white"
              >
                {ownerFunctionSelectOptions().map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Risiko">
              <select
                value={draft.priority}
                onChange={(e) => patch({ priority: e.target.value as IssuePriority })}
                className="w-full rounded-lg border border-[#3d3f44] bg-[#1e1f21] px-2 py-1.5 text-sm text-white"
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <PriorityBadge priority={draft.priority} />
            <span className="rounded-full bg-[#3d3f44] px-2 py-0.5 text-[10px] text-[#d1d5db]">
              {OWNER_FUNCTION_LABELS[draft.ownerFunction]}
            </span>
            {draft.status === "in_progress" ? <WorkflowBadge status="in_progress" /> : null}
          </div>

          <Field label="Beschreibung" className="mt-5">
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              onBlur={() => patch({ description: draft.description?.trim() || null })}
              rows={4}
              placeholder="Notizen zur Aufgabe…"
              className="w-full resize-y rounded-lg border border-[#3d3f44] bg-[#1e1f21] px-3 py-2 text-sm text-[#e5e7eb] placeholder:text-[#6b7280] focus:border-[#4573d2] focus:outline-none"
            />
          </Field>

          <div className="mt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">Unteraufgaben</p>
            <ul className="mt-2 space-y-1">
              {draft.subtasks.map((sub) => (
                <li key={sub.id} className="group/sub flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-[#1e1f21]">
                  <input
                    type="checkbox"
                    checked={sub.done}
                    onChange={() => toggleSubtask(sub.id)}
                    className="size-3.5 rounded accent-[#4573d2]"
                  />
                  <span className={cn("flex-1 text-sm text-[#e5e7eb]", sub.done && "text-[#6b7280] line-through")}>
                    {sub.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSubtask(sub.id)}
                    className="rounded p-0.5 text-[#6b7280] opacity-0 hover:text-red-400 group-hover/sub:opacity-100"
                    aria-label="Unteraufgabe entfernen"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <SubtaskAddRow onAdd={addSubtask} />
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-1 text-xs font-medium text-[#9ca3af]">{label}</p>
      {hint ? <p className="mb-1.5 text-[10px] leading-snug text-[#6b7280]">{hint}</p> : null}
      {children}
    </div>
  );
}

function SubtaskAddRow({ onAdd }: { onAdd: (text: string) => void }) {
  const [draft, setDraft] = useState("");

  return (
    <div className="mt-2 flex items-center gap-2">
      <Plus className="size-3.5 shrink-0 text-[#6b7280]" />
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Unteraufgabe hinzufügen…"
        className="min-w-0 flex-1 bg-transparent text-sm text-[#e5e7eb] placeholder:text-[#6b7280] focus:outline-none"
        onKeyDown={(e) => {
          if (e.key === "Enter" && draft.trim()) {
            onAdd(draft.trim());
            setDraft("");
          }
        }}
      />
    </div>
  );
}
