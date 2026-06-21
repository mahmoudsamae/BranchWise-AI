"use client";

import Link from "next/link";
import { Eye, LayoutGrid } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { IssueHubOverview } from "@/components/branch/issues/issue-hub-overview";
import { KindBadge } from "@/components/branch/issues/issue-shared";
import { IssueWorkspace } from "@/components/branch/issues/issue-workspace";
import { ErrorState } from "@/components/ui/ErrorState";
import { cn } from "@/lib/cn";
import { issueProgressPercent, matchesSearch } from "@/lib/branch/issue-metrics";
import type { BranchIssue } from "@/lib/branch/problems";

type FilterKind = "all" | "problem" | "project";

export function GmIssuesHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const issueParam = searchParams.get("issue");

  const [issues, setIssues] = useState<BranchIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<FilterKind>("all");
  const [sidebarSearch, setSidebarSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(issueParam);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/dashboard/issues")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Laden fehlgeschlagen");
        return r.json();
      })
      .then((j: { issues: BranchIssue[] }) => setIssues(j.issues ?? []))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (issueParam) setSelectedId(issueParam);
  }, [issueParam]);

  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (kindFilter !== "all" && i.kind !== kindFilter) return false;
      return matchesSearch(i, sidebarSearch);
    });
  }, [issues, kindFilter, sidebarSearch]);

  const groupedByBranch = useMemo(() => {
    const map = new Map<string, { branchName: string; items: BranchIssue[] }>();
    for (const issue of filtered) {
      const key = issue.ownerBranchId;
      const existing = map.get(key);
      if (existing) {
        existing.items.push(issue);
      } else {
        map.set(key, { branchName: issue.ownerBranchName, items: [issue] });
      }
    }
    return [...map.values()].sort((a, b) => a.branchName.localeCompare(b.branchName, "de"));
  }, [filtered]);

  const selected = issues.find((i) => i.id === selectedId) ?? null;

  const counts = useMemo(() => {
    const open = issues.filter((i) => i.status === "open");
    return {
      total: open.length,
      projects: open.filter((i) => i.kind === "project").length,
      problems: open.filter((i) => i.kind === "problem").length,
      branches: new Set(open.map((i) => i.ownerBranchId)).size,
    };
  }, [issues]);

  function selectIssue(id: string) {
    setSelectedId(id);
    router.replace(`/dashboard/projects?issue=${id}`, { scroll: false });
  }

  function renderIssueButton(issue: BranchIssue) {
    return (
      <button
        key={issue.id}
        type="button"
        onClick={() => selectIssue(issue.id)}
        className={cn(
          "mb-1 flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition",
          selectedId === issue.id
            ? "bg-[var(--accent)]/15 text-white"
            : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-white",
        )}
      >
        <LayoutGrid className="mt-0.5 size-3.5 shrink-0 opacity-60" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{issue.title}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-muted)]">
            <KindBadge kind={issue.kind} />
            {issueProgressPercent(issue)}%
          </span>
        </span>
      </button>
    );
  }

  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col pb-6">
      <header className="mb-4 space-y-3">
        <div>
          <Link href="/dashboard" className="text-sm text-[var(--accent-light)] hover:underline">
            ← Dashboard
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-white">Projekte & Probleme</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {counts.total} offen · {counts.problems} Probleme · {counts.projects} Projekte · {counts.branches}{" "}
            {counts.branches === 1 ? "Filiale" : "Filialen"}
          </p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-[var(--accent)]/25 bg-[var(--accent)]/5 px-4 py-3">
          <Eye className="mt-0.5 size-4 shrink-0 text-[var(--accent-light)]" aria-hidden />
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="font-medium text-white">Überwachung (Operationsleitung)</span> — Sie sehen alle
            Filialen, Notizen, Aufgaben und Aktivitäten. Änderungen nimmt der verantwortliche Campchef vor.
          </p>
        </div>
      </header>

      {!selected && !loading ? <IssueHubOverview issues={issues} /> : null}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <aside className="flex w-72 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg-primary)]">
          <div className="border-b border-[var(--border)] p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Alle Filialen
            </p>
            <input
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Suchen…"
              className="mt-2 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs text-white"
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
                    kindFilter === id ? "bg-[var(--accent)] text-white" : "text-[var(--text-muted)] hover:text-white",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2 bw-scrollbar">
            {loading ? (
              <p className="px-2 py-4 text-xs text-[var(--text-muted)] animate-pulse">Laden…</p>
            ) : groupedByBranch.length === 0 ? (
              <p className="px-2 py-4 text-xs text-[var(--text-muted)]">Keine offenen Einträge.</p>
            ) : (
              groupedByBranch.map(({ branchName, items }) => (
                <div key={branchName} className="mb-4">
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-light)]">
                    {branchName}
                  </p>
                  {items.map(renderIssueButton)}
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--bg-primary)]">
          {selected ? (
            <IssueWorkspace
              issue={selected}
              staff={[]}
              readOnlyOversight
              onUpdated={(updated) => setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))}
              onCompleted={() => {}}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-subtle)] p-10 text-center">
              <LayoutGrid className="size-10 text-[var(--text-muted)]" />
              <p className="mt-4 text-sm font-medium text-[var(--text-secondary)]">
                Projekt oder Problem auswählen
              </p>
              <p className="mt-1 max-w-md text-xs text-[var(--text-muted)]">
                Links ein Element wählen — Sie sehen Phasen, Aufgaben, Notizen, Timeline und die komplette
                Aktivitätshistorie.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
