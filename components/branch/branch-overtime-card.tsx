import Link from "next/link";

import type { OvertimeSummary } from "@/lib/branch/overtime-summary";
import { formatStaffHours } from "@/lib/staff/format-hours";

function formatUploadStatus(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" }).format(new Date(iso));
  } catch {
    return null;
  }
}

function monthBadgeLabel(monthLabel: string): string {
  return monthLabel.toUpperCase();
}

export function BranchOvertimeCard({ overtime }: { overtime: OvertimeSummary }) {
  const uploaded = formatUploadStatus(overtime.lastUpdated);

  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 transition hover:border-amber-500/30">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[#9ca3af]">Überstunden</p>
        <span className="text-[10px] uppercase tracking-wide text-[#6b7280]">Monatlich · HR</span>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-[#6b7280]">{monthBadgeLabel(overtime.monthLabel)}</p>

      <p className="mt-2 text-3xl font-bold text-amber-400">
        {formatStaffHours(overtime.monthHours)} h{" "}
        <span className="text-sm font-normal text-[#9ca3af]">Team gesamt</span>
      </p>

      {overtime.nearLimitCount > 0 ? (
        <p className="mt-2 text-sm font-medium text-amber-300">
          {overtime.nearLimitCount} Mitarbeiter nahe Grenze
          {overtime.nearLimitNames.length > 0 ? `: ${overtime.nearLimitNames.join(", ")}` : ""}
        </p>
      ) : overtime.staffWithOvertimeMonth > 0 ? (
        <p className="mt-2 text-sm text-[#9ca3af]">
          {overtime.staffWithOvertimeMonth} Mitarbeiter mit Überstunden diesen Monat
        </p>
      ) : (
        <p className="mt-2 text-sm text-[#6b7280]">Keine Überstunden in diesem Monat</p>
      )}

      {uploaded ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-[#6b7280]">
          <span className="inline-block size-1.5 rounded-full bg-emerald-400" aria-hidden />
          Hochgeladen {uploaded} · für HR sichtbar
        </p>
      ) : (
        <p className="mt-2 text-xs text-[#6b7280]">Noch kein Eintrag in diesem Monat</p>
      )}

      <Link href="/branch/staff" className="mt-4 inline-flex text-sm font-medium text-[#a5b4fc] hover:text-[#c7d2fe]">
        Upload / Verlauf →
      </Link>
    </div>
  );
}
