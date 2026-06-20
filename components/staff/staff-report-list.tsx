"use client";

import { cn } from "@/lib/cn";
import { formatPeriodLabel } from "@/lib/staff/period";

import { StaffReportEntryDiscussion } from "./staff-report-entry-discussion";

export type StaffReportEntryView = {
  id: string;
  week_start: string;
  period_end?: string | null;
  hours_worked: number;
  overtime_hours: number;
  absences: number;
  late_arrivals: number;
  notes: string | null;
  summary: string | null;
  report_id: string | null;
  created_at?: string;
};

function sourceLabel(entry: StaffReportEntryView) {
  return entry.report_id ? "Weekly HR report" : "Branch manager report";
}

function formatNum(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function StaffReportList({
  entries,
  emptyMessage = "No report entries yet",
  staffMemberId,
  viewerRole,
  discussionUnreadByEntry = {},
  highlightEntryId,
}: {
  entries: StaffReportEntryView[];
  emptyMessage?: string;
  staffMemberId: string;
  viewerRole: "hr" | "branch";
  discussionUnreadByEntry?: Record<string, number>;
  highlightEntryId?: string | null;
}) {
  if (entries.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-[#9ca3af]">{emptyMessage}</p>;
  }

  return (
    <div className="divide-y divide-[#1f2937]">
      {entries.map((e) => {
        const highOvertime = e.overtime_hours >= 4;
        return (
          <article key={e.id} className="px-4 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-white">{formatPeriodLabel(e.week_start, e.period_end)}</p>
                <p className="mt-0.5 text-xs text-[#6b7280]">{sourceLabel(e)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <MetricPill label="Hours" value={`${formatNum(e.hours_worked)} h`} />
                <MetricPill
                  label="Overtime"
                  value={`${formatNum(e.overtime_hours)} h`}
                  highlight={highOvertime ? "warn" : undefined}
                />
                <MetricPill label="Absences" value={String(e.absences)} highlight={e.absences > 0 ? "bad" : undefined} />
                <MetricPill label="Late" value={String(e.late_arrivals)} />
              </div>
            </div>

            {e.summary?.trim() || e.notes?.trim() ? (
              <div className="mt-4 space-y-2 rounded-xl border border-[#1f2937] bg-[#0a0f1e]/60 p-4">
                {e.summary?.trim() ? (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">Performance summary</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[#e5e7eb]">{e.summary.trim()}</p>
                  </div>
                ) : null}
                {e.notes?.trim() ? (
                  <div className={e.summary?.trim() ? "border-t border-[#1f2937] pt-3" : ""}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6b7280]">Notes</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-[#9ca3af]">{e.notes.trim()}</p>
                  </div>
                ) : null}
              </div>
            ) : null}

            <StaffReportEntryDiscussion
              entryId={e.id}
              staffMemberId={staffMemberId}
              viewerRole={viewerRole}
              unreadCount={discussionUnreadByEntry[e.id] ?? 0}
              defaultOpen={highlightEntryId === e.id}
            />
          </article>
        );
      })}
    </div>
  );
}

function MetricPill({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: "warn" | "bad";
}) {
  return (
    <span
      className={cn(
        "inline-flex flex-col rounded-lg border border-[#374151] bg-[#0a0f1e] px-2.5 py-1 text-center min-w-[4.5rem]",
        highlight === "warn" && "border-amber-500/40 bg-amber-500/10",
        highlight === "bad" && "border-red-500/30 bg-red-500/10",
      )}
    >
      <span className="text-[10px] uppercase tracking-wide text-[#6b7280]">{label}</span>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums text-white",
          highlight === "warn" && "text-amber-200",
          highlight === "bad" && "text-red-300",
        )}
      >
        {value}
      </span>
    </span>
  );
}
