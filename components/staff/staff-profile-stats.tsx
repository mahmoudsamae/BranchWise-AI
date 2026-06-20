"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import { formatStaffHours } from "@/lib/staff/format-hours";
import {
  currentBerlinMonth,
  currentCalendarWeek,
  formatPeriodLabel,
  sumEntriesInPeriod,
  type EntryTotals,
} from "@/lib/staff/period";

type StatsEntry = {
  week_start: string;
  period_end?: string | null;
  hours_worked: number;
  overtime_hours: number;
  absences: number;
  late_arrivals: number;
};

type FilterMode = "week" | "month" | "custom";

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "amber";
}) {
  return (
    <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
      <p className="text-xs uppercase text-[#6b7280]">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", accent ? "text-amber-400" : "text-white")}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#6b7280]">{sub}</p> : null}
    </article>
  );
}

export function StaffProfileStats({ entries }: { entries: StatsEntry[] }) {
  const [mode, setMode] = useState<FilterMode>("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (mode === "week") return currentCalendarWeek();
    if (mode === "month") return currentBerlinMonth();
    if (customFrom && customTo && customTo >= customFrom) {
      return { period_start: customFrom, period_end: customTo };
    }
    return currentBerlinMonth();
  }, [mode, customFrom, customTo]);

  const totals: EntryTotals = useMemo(
    () => sumEntriesInPeriod(entries, range.period_start, range.period_end),
    [entries, range.period_start, range.period_end],
  );

  const rangeLabel = formatPeriodLabel(range.period_start, range.period_end);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[#9ca3af]">
          Stats for <span className="font-medium text-[#e5e7eb]">{rangeLabel}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["week", "This week"],
              ["month", "This month"],
              ["custom", "Custom"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                mode === id
                  ? "bg-[#6366f1] text-white"
                  : "border border-[#374151] bg-[#0a0f1e] text-[#9ca3af] hover:border-[#6366f1]/40 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "custom" ? (
        <div className="flex flex-wrap gap-3">
          <label className="text-xs text-[#9ca3af]">
            From
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-1.5 text-sm text-white"
            />
          </label>
          <label className="text-xs text-[#9ca3af]">
            To
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="mt-1 block rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-1.5 text-sm text-white"
            />
          </label>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total hours" value={formatStaffHours(totals.hours)} sub="In selected period" />
        <StatCard
          label="Overtime"
          value={`${formatStaffHours(totals.overtime)}h`}
          sub="In selected period"
          accent={totals.overtime > 0 ? "amber" : undefined}
        />
        <StatCard label="Absences" value={String(totals.absences)} sub="In selected period" />
        <StatCard label="Late arrivals" value={String(totals.late)} sub="In selected period" />
      </div>
    </section>
  );
}
