"use client";

import { computeHubStats, recentActivities } from "@/lib/branch/issue-metrics";
import type { BranchIssue } from "@/lib/branch/problems";

export function IssueHubOverview({ issues }: { issues: BranchIssue[] }) {
  const stats = computeHubStats(issues);
  const activity = recentActivities(issues, 6);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Aktiv" value={String(stats.active)} hint="Offene Einträge" />
        <StatCard label="Abgeschlossen" value={String(stats.completed)} hint="Erledigt" />
        <StatCard label="Blockiert" value={String(stats.blocked)} hint="Handlung nötig" accent={stats.blocked > 0 ? "warn" : undefined} />
        <StatCard label="Fällig (7 Tage)" value={String(stats.dueSoon)} hint="Deadlines" accent={stats.dueSoon > 0 ? "warn" : undefined} />
        <StatCard label="Ø Fortschritt" value={`${stats.avgProgress}%`} hint="Aktive Einträge" />
      </div>

      {activity.length > 0 ? (
        <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Letzte Aktivität</p>
          <ul className="mt-3 space-y-2">
            {activity.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="text-[#e5e7eb]">
                  <span className="font-medium">{row.issueTitle}</span>
                  <span className="text-[#6b7280]"> — {row.action}</span>
                  {row.detail ? <span className="text-[#9ca3af]"> · {row.detail}</span> : null}
                </span>
                <time className="text-[10px] text-[#6b7280]">
                  {new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
                    new Date(row.at),
                  )}
                </time>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint: string;
  accent?: "warn";
}) {
  return (
    <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
      <p className="text-[10px] uppercase tracking-wide text-[#6b7280]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent === "warn" ? "text-amber-400" : "text-white"}`}>{value}</p>
      <p className="mt-1 text-xs text-[#6b7280]">{hint}</p>
    </article>
  );
}
