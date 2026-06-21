"use client";

import { CheckCircle2, Eye, RotateCcw } from "lucide-react";
import { useState } from "react";

import { IssueCollaboratorsPanel } from "@/components/branch/issues/issue-collaborators-panel";
import { IssueKanbanBoard } from "@/components/branch/issues/issue-kanban-board";
import { IssueListView } from "@/components/branch/issues/issue-list-view";
import { IssueStageTracker } from "@/components/branch/issues/issue-stage-tracker";
import { KindBadge, PriorityBadge, WorkflowBadge } from "@/components/branch/issues/issue-shared";
import { IssueTimelineView } from "@/components/branch/issues/issue-timeline-view";
import { cn } from "@/lib/cn";
import { patchIssue, type StaffOption } from "@/lib/branch/issue-client";
import {
  ACTIVE_WORKFLOW_STATUSES,
  closeIssueFields,
  isIssueClosed,
  reopenIssueFields,
} from "@/lib/branch/issue-lifecycle";
import { flattenIssueTasks, issueProgressPercent } from "@/lib/branch/issue-metrics";
import { checklistStats } from "@/lib/branch/issue-stage-data";
import {
  PRIORITY_LABELS,
  WORKFLOW_LABELS,
  type IssuePriority,
  type IssueWorkflowStatus,
} from "@/lib/branch/issue-types";
import type { BranchIssue } from "@/lib/branch/problems";

type WorkspaceTab = "overview" | "list" | "board" | "timeline" | "activity";

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "overview", label: "Übersicht" },
  { id: "list", label: "Liste" },
  { id: "board", label: "Board" },
  { id: "timeline", label: "Timeline" },
  { id: "activity", label: "Aktivität" },
];

export function IssueWorkspace({
  issue,
  staff,
  readOnlyOversight = false,
  onUpdated,
  onCompleted,
}: {
  issue: BranchIssue;
  staff: StaffOption[];
  readOnlyOversight?: boolean;
  onUpdated: (issue: BranchIssue) => void;
  onCompleted: (id: string) => void;
}) {
  const [tab, setTab] = useState<WorkspaceTab>(readOnlyOversight ? "overview" : "list");
  const [closing, setClosing] = useState(false);
  const progress = issueProgressPercent(issue);
  const closed = isIssueClosed(issue.status, issue.workflowStatus);

  async function saveMeta(body: Record<string, unknown>) {
    if (!issue.canManage) return;
    const updated = await patchIssue(issue.id, body);
    onUpdated(updated);
    if (isIssueClosed(updated.status, updated.workflowStatus)) {
      onCompleted(updated.id);
    }
  }

  async function closeIssue() {
    if (!issue.canManage || closed) return;
    const openTasks = flattenIssueTasks(issue).filter((t) => t.status !== "completed");
    if (openTasks.length > 0 && !window.confirm(`${openTasks.length} offene Aufgabe(n). Trotzdem abschließen?`)) {
      return;
    }
    setClosing(true);
    try {
      const updated = await patchIssue(issue.id, {
        ...closeIssueFields(),
        currentStage: Math.max(issue.stages.length - 1, 0),
        activityAction: "Abgeschlossen",
        activityDetail: issue.title,
      });
      onUpdated(updated);
      onCompleted(issue.id);
    } finally {
      setClosing(false);
    }
  }

  async function reopenIssue() {
    if (!issue.canManage || !closed) return;
    setClosing(true);
    try {
      const updated = await patchIssue(issue.id, {
        ...reopenIssueFields("in_progress"),
        activityAction: "Wieder geöffnet",
      });
      onUpdated(updated);
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-[#1f2937] px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <KindBadge kind={issue.kind} />
              <WorkflowBadge status={issue.workflowStatus} />
              <PriorityBadge priority={issue.priority} />
              {issue.isCollaborator ? (
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                  Mitwirkender
                </span>
              ) : null}
              {issue.sharedWithMe ? (
                <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                  Geteilt · {issue.ownerBranchName}
                </span>
              ) : null}
              {!issue.sharedWithMe && issue.ownerUserName ? (
                <span className="rounded-full bg-[#1f2937] px-2 py-0.5 text-[10px] text-[#9ca3af]">
                  Verantwortlich: {issue.ownerUserName}
                </span>
              ) : null}
              {readOnlyOversight ? (
                <span className="rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent-light)]">
                  {issue.ownerBranchName}
                </span>
              ) : null}
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white">{issue.title}</h2>
            <p className="mt-1 text-sm text-[#9ca3af]">
              Phase {issue.currentStage + 1}/{issue.stages.length}:{" "}
              <span className="text-amber-300">{issue.stages[issue.currentStage]}</span> · {progress}% Fortschritt
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {readOnlyOversight ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-3 py-1.5 text-xs text-[var(--accent-light)]">
                <Eye className="size-3.5" aria-hidden />
                Nur Ansicht — Überwachung
              </span>
            ) : issue.canManage ? (
              <>
            {!closed ? (
              <select
                value={issue.workflowStatus === "completed" ? "in_progress" : issue.workflowStatus}
                onChange={(e) =>
                  void saveMeta({
                    workflowStatus: e.target.value as IssueWorkflowStatus,
                    activityAction: "Status geändert",
                    activityDetail: WORKFLOW_LABELS[e.target.value as IssueWorkflowStatus],
                  })
                }
                className="rounded-lg border border-[#374151] bg-[#111827] px-2 py-1.5 text-xs text-white"
              >
                {ACTIVE_WORKFLOW_STATUSES.map((k) => (
                  <option key={k} value={k}>
                    {WORKFLOW_LABELS[k]}
                  </option>
                ))}
              </select>
            ) : (
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-300">
                Abgeschlossen
              </span>
            )}
            <select
              value={issue.priority}
              onChange={(e) =>
                void saveMeta({
                  priority: e.target.value as IssuePriority,
                  activityAction: "Priorität geändert",
                  activityDetail: PRIORITY_LABELS[e.target.value as IssuePriority],
                })
              }
              disabled={closed}
              className="rounded-lg border border-[#374151] bg-[#111827] px-2 py-1.5 text-xs text-white disabled:opacity-50"
            >
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={issue.dueDate ?? ""}
              onChange={(e) => void saveMeta({ dueDate: e.target.value || null, activityAction: "Deadline gesetzt" })}
              disabled={closed}
              className="rounded-lg border border-[#374151] bg-[#111827] px-2 py-1.5 text-xs text-white disabled:opacity-50"
              title="Projekt-Deadline"
            />
            {!closed ? (
              <button
                type="button"
                onClick={() => void closeIssue()}
                disabled={closing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                <CheckCircle2 className="size-3.5" />
                Abschließen
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void reopenIssue()}
                disabled={closing}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#374151] bg-[#111827] px-3 py-1.5 text-xs text-[#e5e7eb] hover:bg-[#1f2937] disabled:opacity-50"
              >
                <RotateCcw className="size-3.5" />
                Wieder öffnen
              </button>
            )}
              </>
            ) : (
              <span className="rounded-lg border border-[#374151] bg-[#111827]/50 px-2 py-1.5 text-xs text-[#6b7280]">
                {issue.isCollaborator ? "Mitwirkender — nur bestehende Aufgaben bearbeiten" : "Nur Aufgaben bearbeiten"}
              </span>
            )}
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-1 border-b border-[#1f2937] pb-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-t-lg px-4 py-2 text-sm font-medium transition",
                tab === t.id
                  ? "border border-b-0 border-[#1f2937] bg-[#111827] text-white"
                  : "text-[#9ca3af] hover:text-white",
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-[#111827]">
        {tab === "overview" ? (
          <div className="space-y-6 p-5">
            <IssueStageTracker stages={issue.stages} currentStage={issue.currentStage} />
            {issue.kind === "project" && !readOnlyOversight ? (
              <IssueCollaboratorsPanel issue={issue} onUpdated={onUpdated} />
            ) : issue.kind === "project" && issue.collaborators.length > 0 ? (
              <div className="rounded-xl border border-[#1f2937] bg-[#0a0f1e]/50 p-4">
                <p className="text-xs uppercase text-[#6b7280]">Mitwirkende</p>
                <ul className="mt-2 space-y-1 text-sm text-[#e5e7eb]">
                  {issue.collaborators.map((c) => (
                    <li key={c.userId}>
                      {c.userName} · {c.branchName}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3">
              {issue.stages.map((stage, i) => {
                const stats = checklistStats(issue.stageChecklists[String(i)]);
                return (
                  <div key={stage} className="rounded-xl border border-[#1f2937] bg-[#0a0f1e]/50 p-4">
                    <p className="text-xs uppercase text-[#6b7280]">Meilenstein</p>
                    <p className="mt-1 font-medium text-white">{stage}</p>
                    <p className="mt-2 text-sm text-[#9ca3af]">
                      {stats.total > 0 ? `${stats.done}/${stats.total} Aufgaben` : "Keine Aufgaben"}
                    </p>
                    {issue.stageDueDates[String(i)] ? (
                      <p className="mt-1 text-xs text-amber-300">Fällig {issue.stageDueDates[String(i)]}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
            {issue.notes ? (
              <div className="rounded-xl border border-[#1f2937] bg-[#0a0f1e]/50 p-4">
                <p className="text-xs uppercase text-[#6b7280]">Notizen</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[#e5e7eb]">{issue.notes}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "list" ? (
          <IssueListView
            issue={issue}
            staff={staff}
            onUpdated={onUpdated}
            readOnly={readOnlyOversight || closed || !issue.canEditTasks}
          />
        ) : null}

        {tab === "board" ? (
          <div className="p-5">
            {readOnlyOversight || (issue.canEditTasks && !closed) ? (
              <IssueKanbanBoard
                issue={issue}
                readOnly={readOnlyOversight || !issue.canEditTasks || closed}
                onChecklistsChange={async (next) => {
                  const updated = await patchIssue(issue.id, { stageChecklists: next, activityAction: "Board aktualisiert" });
                  onUpdated(updated);
                }}
              />
            ) : (
              <p className="text-sm text-[#6b7280]">Keine Berechtigung zum Bearbeiten des Boards.</p>
            )}
          </div>
        ) : null}

        {tab === "timeline" ? (
          <div className="p-5">
            <IssueTimelineView issue={issue} />
          </div>
        ) : null}

        {tab === "activity" ? (
          <ul className="space-y-2 p-5">
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
      </div>
    </div>
  );
}
