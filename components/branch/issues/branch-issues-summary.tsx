"use client";

import Link from "next/link";

import { IssueStageTracker } from "@/components/branch/issues/issue-stage-tracker";
import { cn } from "@/lib/cn";
import type { BranchIssue } from "@/lib/branch/problems";

function KindBadge({ kind }: { kind: BranchIssue["kind"] }) {
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

function IssueCompactCard({ issue }: { issue: BranchIssue }) {
  const stageName = issue.stages[issue.currentStage] ?? "—";
  const stageNote = issue.stageNotes[String(issue.currentStage)];

  return (
    <Link
      href={`/branch/projects?issue=${issue.id}`}
      className="block rounded-xl border border-[#1f2937] bg-[#0a0f1e]/40 p-4 transition hover:border-indigo-500/30"
    >
      <KindBadge kind={issue.kind} />
      <h3 className="mt-1.5 font-medium text-[#f9fafb]">{issue.title}</h3>
      <IssueStageTracker stages={issue.stages} currentStage={issue.currentStage} compact />
      <p className="mt-2 text-xs text-[#9ca3af]">
        Aktuell: <span className="text-amber-300">{stageName}</span>
        {stageNote ? ` · ${stageNote}` : null}
        {issue.costEstimate ? ` · €${issue.costEstimate.toLocaleString("de-DE")}` : null}
      </p>
    </Link>
  );
}

export function BranchIssuesSummary({ issues }: { issues: BranchIssue[] }) {
  const open = issues.filter((i) => i.status === "open");

  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#f9fafb]">Projekte & Probleme</h2>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {open.length} aktiv{open.length === 1 ? "" : "e"} — Fortschritt auf einen Blick
          </p>
        </div>
        <Link
          href="/branch/projects"
          className="shrink-0 rounded-lg border border-[#374151] px-3 py-1.5 text-xs font-medium text-[#a5b4fc] hover:border-indigo-500/40 hover:text-white"
        >
          Verwalten →
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {open.length === 0 ? (
          <p className="text-sm text-[#6b7280]">Keine offenen Projekte oder Probleme.</p>
        ) : (
          open.slice(0, 4).map((issue) => <IssueCompactCard key={issue.id} issue={issue} />)
        )}
        {open.length > 4 ? (
          <Link href="/branch/projects" className="inline-flex text-sm text-[#a5b4fc] hover:underline">
            +{open.length - 4} weitere anzeigen →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
