"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ErrorState } from "@/components/ui/ErrorState";
import type { OperationsDashboardData, OperationsProject } from "@/lib/gm-hr/operations-dashboard";

const PROJECT_STATUS: Record<OperationsProject["status"], { badge: string; bar: string }> = {
  blocked: { badge: "bg-red-500/20 text-red-300 ring-red-500/40", bar: "bg-red-500" },
  waiting: { badge: "bg-amber-500/20 text-amber-300 ring-amber-500/40", bar: "bg-amber-400" },
  running: { badge: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40", bar: "bg-emerald-500" },
};

export function GmProjectsOverview() {
  const [data, setData] = useState<OperationsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/dashboard/operations")
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Laden fehlgeschlagen");
        return r.json();
      })
      .then((j: { operations: OperationsDashboardData }) => setData(j.operations))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, { branchId: string; branchName: string; projects: OperationsProject[] }>();
    for (const project of data.projects) {
      const existing = map.get(project.branch_id);
      if (existing) {
        existing.projects.push(project);
      } else {
        map.set(project.branch_id, {
          branchId: project.branch_id,
          branchName: project.branch_name,
          projects: [project],
        });
      }
    }
    return [...map.values()].sort((a, b) => a.branchName.localeCompare(b.branchName, "de"));
  }, [data]);

  if (error) return <ErrorState message={error} onRetry={load} />;

  if (loading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-64 rounded-lg bg-[#1f2937]" />
        <div className="h-48 rounded-2xl bg-[#111827]" />
        <div className="h-48 rounded-2xl bg-[#111827]" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8 pb-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-white">Projekte</h1>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Übersicht aller offenen Projekte · {data.header.branch_count} Campingplätze · {data.projects.length}{" "}
          {data.projects.length === 1 ? "Projekt" : "Projekte"}
        </p>
      </header>

      {grouped.length === 0 ? (
        <p className="rounded-2xl border border-[#1f2937] bg-[#111827] p-8 text-center text-sm text-[#9ca3af]">
          Keine offenen Projekte in den Filialen.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ branchId, branchName, projects }) => (
            <section key={branchId} className="overflow-hidden rounded-2xl border border-[#1f2937] bg-[#111827]">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f2937] px-5 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">{branchName}</h2>
                  <p className="text-xs text-[#6b7280]">
                    {projects.length} {projects.length === 1 ? "Projekt" : "Projekte"}
                  </p>
                </div>
                <Link
                  href={`/dashboard/branches/${branchId}`}
                  className="text-sm text-[#a5b4fc] hover:underline"
                >
                  Filiale öffnen →
                </Link>
              </div>
              <ul className="divide-y divide-[#1f2937]/80 p-5">
                {projects.map((p) => {
                  const style = PROJECT_STATUS[p.status];
                  return (
                    <li key={p.id} className="space-y-2 py-4 first:pt-0 last:pb-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-white">{p.title}</p>
                          {p.notes ? <p className="mt-0.5 text-xs text-[#6b7280]">{p.notes}</p> : null}
                        </div>
                        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset ${style.badge}`}>
                          {p.status_label}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#1f2937]">
                        <div className={`h-full rounded-full ${style.bar}`} style={{ width: `${p.progress}%` }} />
                      </div>
                      <p className="text-[10px] text-[#6b7280]">{p.progress}% Fortschritt</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
