"use client";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { IssueDetailPanel } from "@/components/branch/issues/issue-detail-panel";
import { IssueHubOverview } from "@/components/branch/issues/issue-hub-overview";
import { IssuePlanningForm } from "@/components/branch/issues/issue-planning-form";
import { KindBadge } from "@/components/branch/issues/issue-shared";
import { cn } from "@/lib/cn";
import { checklistStats } from "@/lib/branch/issue-stage-data";
import { issueProgressPercent, matchesSearch } from "@/lib/branch/issue-metrics";
import type { BranchIssue } from "@/lib/branch/problems";

type FilterKind = "all" | "problem" | "project";
type StatusFilter = "open" | "done";

export function BranchIssuesHub({ initialIssues }: { initialIssues: BranchIssue[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const issueParam = searchParams.get("issue");

  const [issues, setIssues] = useState(initialIssues);
  const [kindFilter, setKindFilter] = useState<FilterKind>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(issueParam);

  useEffect(() => {
    if (issueParam) setSelectedId(issueParam);
  }, [issueParam]);

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (i.status !== statusFilter) return false;
      if (kindFilter !== "all" && i.kind !== kindFilter) return false;
      return matchesSearch(i, search);
    });
  }, [issues, kindFilter, statusFilter, search]);

  const selected = issues.find((i) => i.id === selectedId) ?? null;

  function selectIssue(id: string) {
    setSelectedId(id);
    router.replace(`/branch/projects?issue=${id}`, { scroll: false });
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/branch" className="text-sm text-[#a5b4fc] hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">Projekte & Probleme</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#9ca3af]">
            Meilensteine, Aufgaben, Kanban und Timeline — alles für die Filial-Execution an einem Ort.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4f46e5]"
        >
          <Plus className="size-4" /> Neu
        </button>
      </div>

      <IssueHubOverview issues={issues} />

      {showForm ? (
        <IssuePlanningForm
          onCreated={(issue) => {
            setIssues((prev) => [issue, ...prev]);
            setShowForm(false);
            selectIssue(issue.id);
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#6b7280]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Suche Projekte, Phasen, Aufgaben…"
            className="w-full rounded-lg border border-[#374151] bg-[#0a0f1e] py-2 pl-9 pr-3 text-sm text-white"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["open", "Aktiv"],
              ["done", "Abgeschlossen"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setStatusFilter(id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium",
                statusFilter === id ? "bg-[#6366f1] text-white" : "border border-[#374151] text-[#9ca3af] hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 w-px self-stretch bg-[#374151]" />
          {(
            [
              ["all", "Alle"],
              ["problem", "Probleme"],
              ["project", "Projekte"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKindFilter(id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium",
                kindFilter === id ? "bg-[#374151] text-white" : "border border-[#374151] text-[#9ca3af] hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <aside className="space-y-2">
          {filtered.length === 0 ? (
            <p className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 text-sm text-[#6b7280]">Keine Treffer.</p>
          ) : (
            filtered.map((issue) => {
              const stageName = issue.stages[issue.currentStage] ?? "—";
              const stats = checklistStats(issue.stageChecklists[String(issue.currentStage)]);
              const progress = issueProgressPercent(issue);
              return (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => selectIssue(issue.id)}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition",
                    selectedId === issue.id
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-[#1f2937] bg-[#111827] hover:border-indigo-500/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <KindBadge kind={issue.kind} />
                    <span className="text-[10px] tabular-nums text-[#6b7280]">{progress}%</span>
                  </div>
                  <p className="mt-1 font-medium text-white">{issue.title}</p>
                  <p className="mt-1 text-xs text-[#9ca3af]">
                    {issue.status === "done" ? "Abgeschlossen" : stageName}
                    {stats.total > 0 ? ` · ${stats.done}/${stats.total} Tasks` : ""}
                  </p>
                </button>
              );
            })
          )}
        </aside>

        <div>
          {selected ? (
            <IssueDetailPanel
              issue={selected}
              onUpdated={(updated) => setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
              onCompleted={(id) => {
                setIssues((prev) =>
                  prev.map((i) =>
                    i.id === id ? { ...i, status: "done" as const, workflowStatus: "completed" as const } : i,
                  ),
                );
                setStatusFilter("done");
              }}
            />
          ) : (
            <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-[#374151] bg-[#111827]/40 p-8 text-center text-sm text-[#6b7280]">
              Eintrag links wählen oder neu anlegen.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
