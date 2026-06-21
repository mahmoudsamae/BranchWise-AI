"use client";

import Link from "next/link";
import { LayoutGrid, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { IssueHubOverview } from "@/components/branch/issues/issue-hub-overview";
import { IssuePlanningForm } from "@/components/branch/issues/issue-planning-form";
import { KindBadge } from "@/components/branch/issues/issue-shared";
import { IssueWorkspace } from "@/components/branch/issues/issue-workspace";
import { cn } from "@/lib/cn";
import { fetchBranchStaffOptions } from "@/lib/branch/issue-client";
import { issueProgressPercent, matchesSearch } from "@/lib/branch/issue-metrics";
import type { BranchIssue } from "@/lib/branch/problems";

type FilterKind = "all" | "problem" | "project";

export function BranchIssuesHub({ initialIssues }: { initialIssues: BranchIssue[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const issueParam = searchParams.get("issue");

  const [issues, setIssues] = useState(initialIssues);
  const [kindFilter, setKindFilter] = useState<FilterKind>("all");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(issueParam);
  const [staff, setStaff] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (issueParam) setSelectedId(issueParam);
  }, [issueParam]);

  useEffect(() => {
    void fetchBranchStaffOptions().then(setStaff);
  }, []);

  const { ownOpen, sharedOpen } = useMemo(() => {
    const filtered = issues.filter((i) => {
      if (i.status !== "open") return false;
      if (kindFilter !== "all" && i.kind !== kindFilter) return false;
      return matchesSearch(i, sidebarSearch);
    });
    return {
      ownOpen: filtered.filter((i) => !i.sharedWithMe),
      sharedOpen: filtered.filter((i) => i.sharedWithMe),
    };
  }, [issues, kindFilter, sidebarSearch]);

  function renderIssueButton(issue: BranchIssue) {
    return (
      <button
        key={issue.id}
        type="button"
        onClick={() => selectIssue(issue.id)}
        className={cn(
          "mb-1 flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition",
          selectedId === issue.id ? "bg-indigo-500/15 text-white" : "text-[#9ca3af] hover:bg-[#111827] hover:text-white",
        )}
      >
        <LayoutGrid className="mt-0.5 size-3.5 shrink-0 opacity-60" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{issue.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-[#6b7280]">
            <KindBadge kind={issue.kind} />
            {issue.sharedWithMe ? (
              <span className="rounded bg-violet-500/15 px-1.5 py-0.5 text-violet-300">Geteilt</span>
            ) : null}
            {issueProgressPercent(issue)}%
          </span>
        </span>
      </button>
    );
  }

  const selected = issues.find((i) => i.id === selectedId) ?? null;

  function selectIssue(id: string) {
    setSelectedId(id);
    router.replace(`/branch/projects?issue=${id}`, { scroll: false });
  }

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col pb-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/branch" className="text-sm text-[#a5b4fc] hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">Projekte & Probleme</h1>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4f46e5]"
        >
          <Plus className="size-4" /> Neu
        </button>
      </div>

      {!selected ? <IssueHubOverview issues={issues} /> : null}

      {showForm ? (
        <div className="mb-4">
          <IssuePlanningForm
            onCreated={(issue) => {
              setIssues((prev) => [issue, ...prev]);
              setShowForm(false);
              selectIssue(issue.id);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-[#1f2937] bg-[#111827]">
        <aside className="flex w-64 shrink-0 flex-col border-r border-[#1f2937] bg-[#0a0f1e]">
          <div className="border-b border-[#1f2937] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">Arbeit</p>
            <input
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Projekte suchen…"
              className="mt-2 w-full rounded-lg border border-[#374151] bg-[#111827] px-2.5 py-1.5 text-xs text-white"
            />
            <div className="mt-2 flex gap-1">
              {(
                [
                  ["all", "Alle"],
                  ["project", "Proj."],
                  ["problem", "Prob."],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setKindFilter(id)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[10px] font-medium",
                    kindFilter === id ? "bg-[#6366f1] text-white" : "text-[#6b7280] hover:text-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {ownOpen.length === 0 && sharedOpen.length === 0 ? (
              <p className="px-2 py-4 text-xs text-[#6b7280]">Keine offenen Einträge.</p>
            ) : (
              <>
                {ownOpen.map(renderIssueButton)}
                {sharedOpen.length > 0 ? (
                  <div className="mt-3 border-t border-[#1f2937] pt-2">
                    <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-violet-400/80">
                      Geteilt mit mir
                    </p>
                    {sharedOpen.map(renderIssueButton)}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0a0f1e]">
          {selected ? (
            <IssueWorkspace
              issue={selected}
              staff={staff}
              onUpdated={(updated) => setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
              onCompleted={(id) => {
                setIssues((prev) =>
                  prev.map((i) =>
                    i.id === id ? { ...i, status: "done" as const, workflowStatus: "completed" as const } : i,
                  ),
                );
                setSelectedId((current) => {
                  if (current === id) {
                    router.replace("/branch/projects", { scroll: false });
                    return null;
                  }
                  return current;
                });
              }}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[#374151] p-10 text-center">
              <LayoutGrid className="size-10 text-[#374151]" />
              <p className="mt-4 text-sm font-medium text-[#9ca3af]">Projekt oder Problem auswählen</p>
              <p className="mt-1 max-w-sm text-xs text-[#6b7280]">
                Links ein Element wählen — Liste, Board und Timeline wie in einem professionellen Projekttool.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
