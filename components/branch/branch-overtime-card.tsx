import Link from "next/link";

import type { OvertimeSummary } from "@/lib/branch/overtime-summary";

function formatRelativeUpload(iso: string | null) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(iso));
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
        {overtime.monthHours}h <span className="text-sm font-normal text-[#9ca3af]">team total</span>
      </p>
      {overtime.nearLimitCount > 0 ? (
        <p className="mt-1 text-sm text-amber-300">
          {overtime.nearLimitCount} employee{overtime.nearLimitCount === 1 ? "" : "s"} nearing the limit
        </p>
      ) : (
        <p className="mt-1 text-sm text-[#6b7280]">No employees nearing the limit</p>
      )}
      {uploaded ? <p className="mt-1 text-xs text-[#6b7280]">Last entry uploaded {uploaded}</p> : null}
      <Link href="/branch/staff" className="mt-4 inline-flex text-sm font-medium text-[#a5b4fc] hover:text-[#c7d2fe]">
        Open Staff →
      </Link>
    </div>
  );
}
