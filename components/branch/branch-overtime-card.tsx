import Link from "next/link";

import type { OvertimeSummary } from "@/lib/branch/overtime-summary";
import { formatStaffHours } from "@/lib/staff/format-hours";

function formatRelativeUpload(iso: string | null) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function BranchOvertimeCard({ overtime }: { overtime: OvertimeSummary }) {
  const uploaded = formatRelativeUpload(overtime.lastUpdated);

  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 transition hover:border-amber-500/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#9ca3af]">Überstunden</p>
        <span className="text-xs uppercase tracking-wide text-[#6b7280]">{overtime.monthLabel}</span>
      </div>
      <p className="mt-2 text-3xl font-bold text-amber-400">
        {formatStaffHours(overtime.monthHours)}h{" "}
        <span className="text-sm font-normal text-[#9ca3af]">diesen Monat</span>
      </p>
      <p className="mt-1 text-sm text-[#9ca3af]">
        {overtime.staffWithOvertimeMonth} Mitarbeiter mit Überstunden ·{" "}
        {formatStaffHours(overtime.allTimeHours)}h gesamt
      </p>
      {overtime.nearLimitCount > 0 ? (
        <p className="mt-2 text-sm text-amber-300">
          {overtime.nearLimitCount} nahe am Limit
          {overtime.nearLimitNames.length > 0 ? `: ${overtime.nearLimitNames.join(", ")}` : ""}
        </p>
      ) : (
        <p className="mt-2 text-sm text-[#6b7280]">Keine Mitarbeiter nahe am Limit</p>
      )}
      {uploaded ? <p className="mt-1 text-xs text-[#6b7280]">Letzter Eintrag: {uploaded}</p> : null}
      <Link href="/branch/staff" className="mt-4 inline-flex text-sm font-medium text-[#a5b4fc] hover:text-[#c7d2fe]">
        Personal öffnen →
      </Link>
    </div>
  );
}
