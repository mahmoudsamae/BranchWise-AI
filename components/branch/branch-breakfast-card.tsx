import Link from "next/link";

import type { BranchBreakfastDashboardSummary } from "@/lib/branch/breakfast-dashboard";

export function BranchBreakfastCard({ breakfast }: { breakfast: BranchBreakfastDashboardSummary }) {
  if (!breakfast.linked) {
    return (
      <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 transition hover:border-amber-500/20">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-[#9ca3af]">Brötchen</p>
          <span className="text-[10px] uppercase tracking-wide text-[#6b7280]">Formular</span>
        </div>
        <p className="mt-3 text-sm text-[#6b7280]">Frühstück nicht verknüpft — external_id in Einstellungen setzen.</p>
        <Link href="/branch/fruhstuck" className="mt-4 inline-flex text-sm font-medium text-[#a5b4fc] hover:text-[#c7d2fe]">
          Frühstück öffnen →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 transition hover:border-amber-500/30">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[#9ca3af]">Brötchen</p>
        <span className="text-[10px] uppercase tracking-wide text-[#6b7280]">Auto · Formular</span>
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-[#6b7280]">Morgen · {breakfast.tomorrowLabel}</p>
      <p className="mt-2 text-3xl font-bold text-amber-400">
        {breakfast.itemCount.toLocaleString("de-DE")}{" "}
        <span className="text-lg font-semibold text-amber-400/90">Brötchen</span>
      </p>
      <p className="mt-1 text-sm text-[#9ca3af]">
        {breakfast.orderCount} Bestellung{breakfast.orderCount === 1 ? "" : "en"} für morgen
      </p>
      {breakfast.hint ? <p className="mt-2 text-sm text-amber-200/90">{breakfast.hint}</p> : null}
      <Link href="/branch/fruhstuck" className="mt-4 inline-flex text-sm font-medium text-[#a5b4fc] hover:text-[#c7d2fe]">
        Brötchen öffnen →
      </Link>
    </div>
  );
}
