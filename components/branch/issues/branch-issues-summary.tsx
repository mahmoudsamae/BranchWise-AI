"use client";

import Link from "next/link";
import { ChevronRight, FileText } from "lucide-react";

import { IssueStageTracker } from "@/components/branch/issues/issue-stage-tracker";
import { KindBadge } from "@/components/branch/issues/issue-shared";
import { buildStatusLine, issueProgressPercent } from "@/lib/branch/issue-metrics";
import type { BranchIssue } from "@/lib/branch/problems";

function IssueDashboardRow({ issue }: { issue: BranchIssue }) {
  const statusLine = buildStatusLine(issue);
  const progress = issueProgressPercent(issue);

  return (
    <article className="rounded-xl border border-[#1f2937] bg-[#0a0f1e]/50 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <KindBadge kind={issue.kind} />
          <h3 className="mt-1.5 text-base font-semibold text-[#f9fafb]">{issue.title}</h3>
        </div>
        <span className="text-xs font-medium tabular-nums text-[#6b7280]">{progress}%</span>
      </div>

      <IssueStageTracker stages={issue.stages} currentStage={issue.currentStage} compact />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-xs leading-relaxed text-[#9ca3af]">{statusLine}</p>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/branch/projects?issue=${issue.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-[#374151] px-2.5 py-1 text-[11px] font-medium text-[#9ca3af] hover:border-indigo-500/40 hover:text-white"
          >
            <FileText className="size-3.5" aria-hidden />
            Details
          </Link>
          <Link
            href={`/branch/projects?issue=${issue.id}`}
            className="inline-flex items-center gap-1 rounded-lg bg-[#6366f1] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#4f46e5]"
          >
            Öffnen
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function BranchIssuesSummary({ issues }: { issues: BranchIssue[] }) {
  const open = issues.filter((i) => i.status === "open");
  const problems = open.filter((i) => i.kind === "problem");
  const projects = open.filter((i) => i.kind === "project");

  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#f9fafb]">Projekte & Probleme</h2>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {open.length} aktiv · {problems.length} Probleme · {projects.length} Projekte
          </p>
        </div>
        <Link
          href="/branch/projects"
          className="shrink-0 rounded-lg border border-[#374151] px-3 py-1.5 text-xs font-medium text-[#a5b4fc] hover:border-indigo-500/40 hover:text-white"
        >
          Alle verwalten →
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {open.length === 0 ? (
          <p className="text-sm text-[#6b7280]">Keine offenen Projekte oder Probleme.</p>
        ) : (
          open.slice(0, 5).map((issue) => <IssueDashboardRow key={issue.id} issue={issue} />)
        )}
        {open.length > 5 ? (
          <Link href="/branch/projects" className="inline-flex text-sm text-[#a5b4fc] hover:underline">
            +{open.length - 5} weitere anzeigen →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
