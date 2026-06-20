"use client";

import { cn } from "@/lib/cn";
import { issueProgressPercent } from "@/lib/branch/issue-metrics";
import { checklistStats, stageStatus } from "@/lib/branch/issue-stage-data";
import type { BranchIssue } from "@/lib/branch/problems";

export function IssueTimelineView({ issue }: { issue: BranchIssue }) {
  const progress = issueProgressPercent(issue);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[#9ca3af]">Gesamtfortschritt</span>
        <span className="font-semibold text-white">{progress}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#1f2937]">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="relative space-y-0">
        {issue.stages.map((stage, i) => {
          const status = stageStatus(i, issue.currentStage);
          const due = issue.stageDueDates[String(i)];
          const stats = checklistStats(issue.stageChecklists[String(i)]);
          const note = issue.stageNotes[String(i)];

          return (
            <div key={`${stage}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
              {i < issue.stages.length - 1 ? (
                <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 bg-[#374151]" aria-hidden />
              ) : null}
              <div
                className={cn(
                  "relative z-10 mt-0.5 size-6 shrink-0 rounded-full border-2",
                  status === "done" && "border-indigo-500 bg-indigo-500",
                  status === "current" && "border-amber-400 bg-[#111827]",
                  status === "upcoming" && "border-[#374151] bg-[#111827]",
                )}
              />
              <div className="min-w-0 flex-1 rounded-xl border border-[#1f2937] bg-[#0a0f1e]/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={cn("font-medium", status === "current" ? "text-amber-300" : "text-white")}>
                    {i + 1}. {stage}
                  </p>
                  <span className="text-[10px] uppercase tracking-wide text-[#6b7280]">
                    {status === "done" ? "Erledigt" : status === "current" ? "Aktuell" : "Geplant"}
                  </span>
                </div>
                {due ? <p className="mt-1 text-xs text-amber-300/90">Fällig: {due}</p> : null}
                {stats.total > 0 ? (
                  <p className="mt-1 text-xs text-[#9ca3af]">
                    Aufgaben: {stats.done}/{stats.total}
                  </p>
                ) : null}
                {note ? <p className="mt-2 text-sm text-[#9ca3af]">{note}</p> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
