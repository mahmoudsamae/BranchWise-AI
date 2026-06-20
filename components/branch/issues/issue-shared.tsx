"use client";

import { cn } from "@/lib/cn";
import {
  PRIORITY_LABELS,
  WORKFLOW_LABELS,
  type IssuePriority,
  type IssueWorkflowStatus,
} from "@/lib/branch/issue-types";
import type { BranchIssue } from "@/lib/branch/problems";

export function KindBadge({ kind }: { kind: BranchIssue["kind"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        kind === "problem" ? "bg-red-500/15 text-red-300" : "bg-indigo-500/15 text-indigo-300",
      )}
    >
      {kind === "problem" ? "Problem" : "Projekt"}
    </span>
  );
}

export function WorkflowBadge({ status }: { status: IssueWorkflowStatus }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        status === "planning" && "bg-slate-500/20 text-slate-300",
        status === "in_progress" && "bg-blue-500/15 text-blue-300",
        status === "blocked" && "bg-red-500/15 text-red-300",
        status === "completed" && "bg-emerald-500/15 text-emerald-300",
      )}
    >
      {WORKFLOW_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: IssuePriority }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-[10px] font-medium",
        priority === "critical" && "bg-red-500/20 text-red-200",
        priority === "high" && "bg-amber-500/20 text-amber-200",
        priority === "medium" && "bg-[#374151] text-[#9ca3af]",
        priority === "low" && "bg-[#1f2937] text-[#6b7280]",
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}
