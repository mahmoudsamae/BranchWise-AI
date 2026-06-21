import Link from "next/link";

import type { TodaysTaskProgress } from "@/lib/branch/todays-tasks";

export function BranchTodaysTasksCard({ tasks }: { tasks: TodaysTaskProgress[] }) {
  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 transition hover:border-indigo-500/30">
      <p className="text-sm font-medium text-[#9ca3af]">Heutige Aufgaben</p>

      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-[#6b7280]">Noch keine Tages-Checklisten eingerichtet.</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {tasks.slice(0, 3).map((t) => {
            const pct = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0;
            return (
              <div key={t.tableId}>
                <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                  <span className="truncate">{t.name}</span>
                  <span className="shrink-0 font-medium text-[#e5e7eb]">
                    {t.completed} / {t.total}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#1f2937]">
                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link
        href="/branch/ops"
        className="mt-4 inline-flex text-sm font-medium text-[#a5b4fc] hover:text-[#c7d2fe]"
      >
        Filialbetrieb öffnen →
      </Link>
    </div>
  );
}
