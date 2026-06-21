"use client";

import { Check, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { IssueKanbanBoard } from "@/components/branch/issues/issue-kanban-board";
import { KindBadge, PriorityBadge, WorkflowBadge } from "@/components/branch/issues/issue-shared";
import { IssueStageTracker } from "@/components/branch/issues/issue-stage-tracker";
import { IssueTimelineView } from "@/components/branch/issues/issue-timeline-view";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { issueProgressPercent } from "@/lib/branch/issue-metrics";
import {
  checklistStats,
  stageStatus,
  syncItemDone,
  type StageChecklistItem,
  type StageChecklists,
} from "@/lib/branch/issue-stage-data";
import {
  PRIORITY_LABELS,
  WORKFLOW_LABELS,
  type IssuePriority,
  type IssueWorkflowStatus,
} from "@/lib/branch/issue-types";
import type { BranchIssue } from "@/lib/branch/problems";

type DetailTab = "phases" | "kanban" | "timeline" | "activity";

async function patchIssue(id: string, body: Record<string, unknown>): Promise<BranchIssue> {
  const res = await fetch(`/api/branch/problems/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen");
  return data.issue as BranchIssue;
}

export function IssueDetailPanel({
  issue,
  onUpdated,
  onCompleted,
}: {
  issue: BranchIssue;
  onUpdated: (issue: BranchIssue) => void;
  onCompleted: (id: string) => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<DetailTab>("phases");
  const [selectedStage, setSelectedStage] = useState(issue.currentStage);
  const [noteDraft, setNoteDraft] = useState("");
  const [checklists, setChecklists] = useState(issue.stageChecklists);
  const [generalNotes, setGeneralNotes] = useState(issue.notes ?? "");
  const [costEstimate, setCostEstimate] = useState(issue.costEstimate?.toString() ?? "");
  const [dueDate, setDueDate] = useState(issue.dueDate ?? "");
  const [stageDue, setStageDue] = useState(issue.stageDueDates[String(issue.currentStage)] ?? "");
  const [newTask, setNewTask] = useState("");
  const [saving, setSaving] = useState(false);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    setSelectedStage(issue.currentStage);
    setChecklists(issue.stageChecklists);
    setGeneralNotes(issue.notes ?? "");
    setCostEstimate(issue.costEstimate?.toString() ?? "");
    setDueDate(issue.dueDate ?? "");
    setStageDue(issue.stageDueDates[String(issue.currentStage)] ?? "");
  }, [issue]);

  useEffect(() => {
    setNoteDraft(issue.stageNotes[String(selectedStage)] ?? "");
    setStageDue(issue.stageDueDates[String(selectedStage)] ?? "");
  }, [selectedStage, issue.stageNotes, issue.stageDueDates]);

  const stageKey = String(selectedStage);
  const checklist = checklists[stageKey] ?? [];
  const stats = checklistStats(checklist);
  const phaseStatus = stageStatus(selectedStage, issue.currentStage);
  const progress = issueProgressPercent(issue);

  const save = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      try {
        const updated = await patchIssue(issue.id, body);
        onUpdated(updated);
        return updated;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Speichern fehlgeschlagen");
        return null;
      } finally {
        setSaving(false);
      }
    },
    [issue.id, onUpdated, toast],
  );

  async function saveNote() {
    const trimmed = noteDraft.trim();
    const prev = issue.stageNotes[stageKey] ?? "";
    if (trimmed === prev) return;
    const nextNotes = { ...issue.stageNotes, [stageKey]: trimmed };
    if (!trimmed) delete nextNotes[stageKey];
    await save({ stageNotes: nextNotes, activityAction: "Notiz gespeichert", activityDetail: issue.stages[selectedStage] });
  }

  async function saveChecklists(next: StageChecklists, action?: string) {
    setChecklists(next);
    await save({
      stageChecklists: next,
      ...(action ? { activityAction: action } : {}),
    });
  }

  async function saveMeta() {
    const nextStageDue = { ...issue.stageDueDates, [stageKey]: stageDue || undefined };
    if (!stageDue) delete nextStageDue[stageKey];
    await save({
      notes: generalNotes.trim() || null,
      costEstimate: costEstimate.trim() ? Number(costEstimate) : null,
      dueDate: dueDate || null,
      stageDueDates: nextStageDue,
      activityAction: "Details aktualisiert",
    });
  }

  async function setWorkflow(workflowStatus: IssueWorkflowStatus) {
    await save({ workflowStatus, activityAction: "Status geändert", activityDetail: WORKFLOW_LABELS[workflowStatus] });
  }

  async function setPriority(priority: IssuePriority) {
    await save({ priority, activityAction: "Priorität geändert", activityDetail: PRIORITY_LABELS[priority] });
  }

  async function toggleTask(itemId: string) {
    const nextList = checklist.map((item) => {
      if (item.id !== itemId) return item;
      const status = item.status === "completed" ? "todo" : "completed";
      return syncItemDone({ ...item, status });
    });
    await saveChecklists({ ...checklists, [stageKey]: nextList }, "Aufgabe aktualisiert");
  }

  async function addTask() {
    const text = newTask.trim();
    if (!text) return;
    const item: StageChecklistItem = {
      id: crypto.randomUUID(),
      text,
      done: false,
      status: "todo",
      priority: "medium",
      dueDate: null,
      assigneeId: null,
      assigneeName: null,
      ownerFunction: "filiale",
      description: null,
      subtasks: [],
    };
    await saveChecklists({ ...checklists, [stageKey]: [...checklist, item] }, "Aufgabe hinzugefügt");
    setNewTask("");
  }

  async function removeTask(itemId: string) {
    await saveChecklists({ ...checklists, [stageKey]: checklist.filter((i) => i.id !== itemId) }, "Aufgabe entfernt");
  }

  async function advanceStage() {
    if (phaseStatus !== "current") return;
    const openTasks = checklist.filter((i) => i.status !== "completed");
    if (openTasks.length > 0 && !window.confirm(`${openTasks.length} offene Aufgabe(n). Trotzdem weiter?`)) return;

    setAdvancing(true);
    try {
      const nextStage = Math.min(issue.currentStage + 1, issue.stages.length - 1);
      const willComplete = issue.currentStage + 1 >= issue.stages.length;
      const updated = await patchIssue(issue.id, {
        currentStage: nextStage,
        status: willComplete ? "done" : "open",
        workflowStatus: willComplete ? "completed" : "in_progress",
        activityAction: willComplete ? "Abgeschlossen" : "Phase gewechselt",
        activityDetail: issue.stages[issue.currentStage],
      });
      onUpdated(updated);
      if (willComplete) {
        onCompleted(issue.id);
        toast.success(`${issue.title} abgeschlossen`);
      } else {
        setSelectedStage(nextStage);
        toast.success(`Phase: ${issue.stages[nextStage]}`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update fehlgeschlagen");
    } finally {
      setAdvancing(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <KindBadge kind={issue.kind} />
            <WorkflowBadge status={issue.workflowStatus} />
            <PriorityBadge priority={issue.priority} />
          </div>
          <h2 className="mt-2 text-xl font-semibold text-white">{issue.title}</h2>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Phase {issue.currentStage + 1}/{issue.stages.length}:{" "}
            <span className="text-amber-300">{issue.stages[issue.currentStage]}</span> · {progress}%
          </p>
        </div>
        {issue.status === "open" && phaseStatus === "current" && tab === "phases" ? (
          <button
            type="button"
            disabled={advancing}
            onClick={() => void advanceStage()}
            className="inline-flex items-center gap-1 rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4f46e5] disabled:opacity-50"
          >
            {advancing ? <Loader2 className="size-4 animate-spin" /> : null}
            {issue.currentStage + 1 >= issue.stages.length ? "Abschließen" : "Nächste Phase"}
            <ChevronRight className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={issue.workflowStatus}
          onChange={(e) => void setWorkflow(e.target.value as IssueWorkflowStatus)}
          className="rounded-lg border border-[#374151] bg-[#0a0f1e] px-2 py-1.5 text-xs text-white"
        >
          {Object.entries(WORKFLOW_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={issue.priority}
          onChange={(e) => void setPriority(e.target.value as IssuePriority)}
          className="rounded-lg border border-[#374151] bg-[#0a0f1e] px-2 py-1.5 text-xs text-white"
        >
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          onBlur={() => void saveMeta()}
          className="rounded-lg border border-[#374151] bg-[#0a0f1e] px-2 py-1.5 text-xs text-white"
          title="Projekt-Deadline"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2 border-b border-[#1f2937] pb-3">
        {(
          [
            ["phases", "Phasen"],
            ["kanban", "Kanban"],
            ["timeline", "Timeline"],
            ["activity", "Aktivität"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium",
              tab === id ? "bg-[#6366f1] text-white" : "text-[#9ca3af] hover:text-white",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "phases" ? (
        <>
          <IssueStageTracker
            stages={issue.stages}
            currentStage={issue.currentStage}
            selectedStage={selectedStage}
            onSelectStage={setSelectedStage}
          />
          <div className="mt-5 rounded-xl border border-[#1f2937] bg-[#0a0f1e]/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-white">
                {selectedStage + 1}. {issue.stages[selectedStage]}
              </h3>
              <span className="text-[10px] uppercase text-[#6b7280]">
                {phaseStatus === "done" ? "Erledigt" : phaseStatus === "current" ? "Aktuell" : "Geplant"}
                {stats.total > 0 ? ` · ${stats.done}/${stats.total}` : ""}
              </span>
            </div>
            <label className="mt-3 block text-xs text-[#9ca3af]">
              Phasen-Deadline
              <input
                type="date"
                value={stageDue}
                onChange={(e) => setStageDue(e.target.value)}
                onBlur={() => void saveMeta()}
                className="mt-1 block w-full max-w-xs rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-1.5 text-sm text-white"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-xs font-medium text-[#9ca3af]">Was ist passiert?</span>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onBlur={() => void saveNote()}
                rows={3}
                className="mt-1.5 w-full resize-none rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-[#e5e7eb]"
              />
            </label>
            <div className="mt-4">
              <p className="text-xs font-medium text-[#9ca3af]">Aufgaben</p>
              <ul className="mt-2 space-y-1.5">
                {checklist.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 rounded-lg border border-[#1f2937] bg-[#111827] px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => void toggleTask(item.id)}
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border",
                        item.status === "completed"
                          ? "border-indigo-500 bg-indigo-500 text-white"
                          : "border-[#374151] text-transparent",
                      )}
                    >
                      <Check className="size-3" />
                    </button>
                    <span className={cn("flex-1 text-sm", item.status === "completed" && "text-[#6b7280] line-through")}>
                      {item.text}
                    </span>
                    <PriorityBadge priority={item.priority} />
                    <button type="button" onClick={() => void removeTask(item.id)} className="text-[#6b7280] hover:text-red-300">
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex gap-2">
                <input
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  placeholder="Neue Aufgabe…"
                  className="min-w-0 flex-1 rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-1.5 text-sm text-white"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void addTask())}
                />
                <button type="button" onClick={() => void addTask()} className="rounded-lg border border-[#374151] px-3 py-1.5 text-xs text-[#9ca3af]">
                  +
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-[#9ca3af]">
              Kostenschätzung (€)
              <input
                type="number"
                min={0}
                step={0.01}
                value={costEstimate}
                onChange={(e) => setCostEstimate(e.target.value)}
                onBlur={() => void saveMeta()}
                className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-[#9ca3af]">
              Allgemeine Notizen
              <textarea
                rows={2}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                onBlur={() => void saveMeta()}
                className="mt-1 w-full resize-none rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              />
            </label>
          </div>
        </>
      ) : null}

      {tab === "kanban" ? (
        <div className="mt-4">
          <IssueKanbanBoard issue={{ ...issue, stageChecklists: checklists }} onChecklistsChange={saveChecklists} />
        </div>
      ) : null}

      {tab === "timeline" ? (
        <div className="mt-4">
          <IssueTimelineView issue={issue} />
        </div>
      ) : null}

      {tab === "activity" ? (
        <ul className="mt-4 space-y-2">
          {issue.activities.length === 0 ? (
            <li className="text-sm text-[#6b7280]">Noch keine Aktivität.</li>
          ) : (
            issue.activities.map((a) => (
              <li key={a.id} className="rounded-lg border border-[#1f2937] bg-[#0a0f1e]/50 px-3 py-2 text-sm">
                <span className="text-white">{a.action}</span>
                {a.detail ? <span className="text-[#9ca3af]"> · {a.detail}</span> : null}
                <time className="mt-1 block text-[10px] text-[#6b7280]">
                  {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(a.at))}
                </time>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {saving ? <p className="mt-2 text-xs text-[#6b7280]">Speichern…</p> : null}
    </div>
  );
}
