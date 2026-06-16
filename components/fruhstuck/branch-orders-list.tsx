"use client";

import { cn } from "@/lib/cn";
import type { BranchBreakfastOrder } from "@/lib/fruhstuck/branch-order-types";

function formatEuro(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n);
}

function formatDate(ymd: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${ymd}T12:00:00Z`));
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Offen",
  delivered: "Ausgegeben",
  not_picked_up: "Nicht abgeholt",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-200",
  delivered: "bg-emerald-500/15 text-emerald-200",
  not_picked_up: "bg-red-500/15 text-red-200",
};

const SOURCE_LABELS: Record<string, string> = {
  qr: "Online / QR",
  staff: "Boden / Personal",
};

function OrderTable({
  rows,
  emptyText,
  highlightPending,
}: {
  rows: BranchBreakfastOrder[];
  emptyText: string;
  highlightPending?: boolean;
}) {
  if (!rows.length) {
    return <p className="px-4 py-6 text-sm text-[#9ca3af]">{emptyText}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="text-xs uppercase text-[#6b7280]">
          <tr className="border-b border-[#1f2937]">
            <th className="px-4 py-3">Nr.</th>
            <th className="px-4 py-3">Gast</th>
            <th className="px-4 py-3">Artikel</th>
            <th className="px-4 py-3">Quelle</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Betrag</th>
            <th className="px-4 py-3">Abholung</th>
            <th className="px-4 py-3">Ausgegeben</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr
              key={o.id}
              className={cn(
                "border-b border-[#1f2937]/60 text-[#e5e7eb]",
                highlightPending && o.status === "pending" && "bg-amber-500/5",
              )}
            >
              <td className="px-4 py-3 font-mono text-white">#{o.order_number}</td>
              <td className="px-4 py-3 font-medium text-white">{o.customer_name}</td>
              <td className="max-w-[240px] truncate px-4 py-3 text-[#9ca3af]" title={o.items_summary}>
                {o.items_summary}
              </td>
              <td className="px-4 py-3">{SOURCE_LABELS[o.source] ?? o.source}</td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_CLASS[o.status] ?? "bg-[#374151] text-[#d1d5db]",
                  )}
                >
                  {STATUS_LABELS[o.status] ?? o.status}
                </span>
              </td>
              <td className="px-4 py-3">{formatEuro(o.total_amount)}</td>
              <td className="px-4 py-3">{formatDate(o.pickup_date)}</td>
              <td className="px-4 py-3">{formatTime(o.delivered_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BranchOrdersList({
  title,
  subtitle,
  rows,
  emptyText,
  highlightPending,
}: {
  title: string;
  subtitle?: string;
  rows: BranchBreakfastOrder[];
  emptyText: string;
  highlightPending?: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#111827]">
      <div className="border-b border-[#1f2937] px-4 py-3">
        <h2 className="text-lg font-semibold text-white">
          {title}{" "}
          <span className="text-base font-normal text-[#6b7280]">({rows.length})</span>
        </h2>
        {subtitle ? <p className="mt-1 text-sm text-[#9ca3af]">{subtitle}</p> : null}
      </div>
      <OrderTable rows={rows} emptyText={emptyText} highlightPending={highlightPending} />
    </section>
  );
}
