"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn } from "@/lib/cn";
import { isAfterHoursHour, WEEKDAY_ORDER } from "@/lib/fruhstuck/constants";
import type { PortfolioInsights } from "@/lib/fruhstuck/portfolio-insights";
import type { BranchOperationsSnapshot } from "@/lib/fruhstuck/branch-operations";
import type { BreakfastAnalyticsData } from "@/lib/fruhstuck/types";

function formatEuro(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
      <p className="text-xs uppercase tracking-wide text-[#6b7280]">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", accent ? "text-[#a5b4fc]" : "text-white")}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#6b7280]">{sub}</p> : null}
    </article>
  );
}

function TrendBadge({ pct, label }: { pct: number | null; label: string }) {
  if (pct == null) return null;
  const up = pct >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        up ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300",
      )}
    >
      {up ? <TrendingUp className="size-3" aria-hidden /> : <TrendingDown className="size-3" aria-hidden />}
      {up ? "+" : ""}
      {pct}% {label}
    </span>
  );
}

export function BranchOperationsBar({ ops }: { ops: BranchOperationsSnapshot }) {
  const tomorrowLabel = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${ops.tomorrow_ymd}T12:00:00Z`));

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-white">Abholungen — Morgen & Heute</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label={`Bestellungen Morgen`}
          value={String(ops.tomorrow.orders)}
          sub={tomorrowLabel}
          accent
        />
        <KpiCard
          label="Morgen noch offen"
          value={String(ops.tomorrow.pending)}
          sub="Noch nicht ausgegeben"
        />
        <KpiCard label="Morgen Umsatz" value={formatEuro(ops.tomorrow.revenue)} />
        <KpiCard
          label="Heute noch offen"
          value={String(ops.today.pending)}
          sub="Noch nicht ausgegeben"
        />
        <KpiCard
          label="Boden heute"
          value={String(ops.today.floor_orders)}
          sub={`${formatEuro(ops.today.floor_revenue)} Direktverkauf`}
        />
        <KpiCard
          label="Heute gesamt"
          value={String(ops.today.orders)}
          sub={formatEuro(ops.today.revenue)}
        />
      </div>
    </section>
  );
}

export function BranchKpiBar({
  insights,
  comparison,
}: {
  insights: PortfolioInsights;
  comparison: { orders_pct: number | null; revenue_pct: number | null };
}) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-white">Übersicht</h2>
        <TrendBadge pct={comparison.orders_pct} label="Bestellungen" />
        <TrendBadge pct={comparison.revenue_pct} label="Umsatz" />
        <span className="text-xs text-[#6b7280]">
          {insights.totalOrders.toLocaleString("de-DE")} Bestellungen im Zeitraum (vollständig geladen)
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Bestellungen" value={String(insights.totalOrders)} />
        <KpiCard label="Umsatz" value={formatEuro(insights.totalRevenue)} accent />
        <KpiCard label="Ø Bestellwert" value={formatEuro(insights.averageOrderValue)} />
        <KpiCard label="Artikel verkauft" value={String(insights.totalItemsSold)} />
      </div>
    </section>
  );
}

export function BranchAfterHoursSection({ insights }: { insights: PortfolioInsights }) {
  const chartData = insights.ordersByHour.map((h) => ({
    hour: h.hour,
    label: formatHour(h.hour),
    count: h.count,
    isAfterHours: h.isAfterHours,
  }));
  const ah = insights.afterHours;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Nach-Feierabend (18:00 – 21:00)</h2>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Küche schließt 18:00 — Bestellungen bis 21:00 zeigen die Belastung außerhalb der Kernschicht.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Bestellungen" value={String(ah.orders)} />
        <KpiCard label="Umsatz" value={formatEuro(ah.revenue)} accent />
        <KpiCard label="Anteil Gesamt" value={`${ah.pctOfOrders}%`} />
        <KpiCard label="Ø Bestellwert" value={formatEuro(ah.averageOrderValue)} />
      </div>

      <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <h3 className="mb-4 text-base font-semibold text-white">Bestellungen nach Uhrzeit</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} interval={1} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
                formatter={(v) => [v, "Bestellungen"]}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.hour} fill={entry.isAfterHours ? "#a855f7" : "#4b5563"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-[#6b7280]">
          <span className="inline-block size-2 rounded-sm bg-[#a855f7]" /> 18:00–21:00 &nbsp;
          <span className="inline-block size-2 rounded-sm bg-[#4b5563]" /> Kernzeiten
        </p>
      </div>
    </section>
  );
}

export function BranchRevenueTrend({ raw }: { raw: BreakfastAnalyticsData }) {
  const data = raw.revenue.revenuePerDay;

  return (
    <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
      <h2 className="mb-4 text-lg font-semibold text-white">Umsatzverlauf</h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#9ca3af", fontSize: 10 }}
              tickFormatter={(v) => String(v).slice(5)}
            />
            <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
              formatter={(v) => [formatEuro(Number(v)), "Umsatz"]}
            />
            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

export function BranchProductsSection({ raw }: { raw: BreakfastAnalyticsData }) {
  const breakdown = raw.products.productsBreakdown.slice(0, 12);
  const barData = breakdown.map((p) => ({ name: p.name.length > 22 ? `${p.name.slice(0, 20)}…` : p.name, count: p.count }));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Top-Produkte</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
          <h3 className="mb-4 text-base font-semibold text-white">Verkaufsmenge</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
                  formatter={(v) => [v, "Stück"]}
                />
                <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#1f2937] bg-[#111827]">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="text-xs uppercase text-[#6b7280]">
              <tr className="border-b border-[#1f2937]">
                <th className="px-4 py-3">Produkt</th>
                <th className="px-4 py-3">Stück</th>
                <th className="px-4 py-3">Umsatz</th>
                <th className="px-4 py-3">Anteil</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((p) => (
                <tr key={p.name} className="border-b border-[#1f2937]/60 text-[#e5e7eb]">
                  <td className="px-4 py-3 font-medium text-white">{p.name}</td>
                  <td className="px-4 py-3">{p.count}</td>
                  <td className="px-4 py-3">{formatEuro(p.revenue)}</td>
                  <td className="px-4 py-3">{p.shareOfSalesPct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function BranchPeakTimeSection({ insights }: { insights: PortfolioInsights }) {
  const max = Math.max(...insights.heatmap.map((c) => c.count), 1);
  const byKey = new Map(insights.heatmap.map((c) => [`${c.weekday}:${c.hour}`, c.count]));

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Stoßzeiten & Wochentage</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Stoßzeit Bestellungen"
          value={insights.peakOrderHour != null ? formatHour(insights.peakOrderHour) : "—"}
        />
        <KpiCard
          label="Stoßzeit Umsatz"
          value={insights.peakRevenueHour != null ? formatHour(insights.peakRevenueHour) : "—"}
          accent
        />
        <KpiCard label="Stärkster Wochentag" value={insights.peakWeekday ?? "—"} />
        <KpiCard label="Schwächster Wochentag" value={insights.slowestWeekday ?? "—"} />
      </div>

      <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <h3 className="mb-4 text-base font-semibold text-white">Bestellungen nach Wochentag</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={insights.weekdayChart}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis
                dataKey="weekday"
                tick={{ fill: "#9ca3af", fontSize: 11 }}
                tickFormatter={(v) => String(v).slice(0, 3)}
              />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
                formatter={(v, name) => [v, name === "orders" ? "Bestellungen" : "Umsatz"]}
              />
              <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <h3 className="mb-2 text-base font-semibold text-white">Heatmap (Wochentag × Uhrzeit)</h3>
        <p className="mb-4 text-xs text-[#6b7280]">
          Dunkler = mehr Bestellungen. Lila = Nach-Feierabend (18:00–21:00).
        </p>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-[720px]">
            <div className="mb-1 grid grid-cols-[72px_repeat(24,1fr)] gap-0.5 text-[10px] text-[#6b7280]">
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="text-center">
                  {h % 3 === 0 ? h : ""}
                </div>
              ))}
            </div>
            {WEEKDAY_ORDER.map((weekday) => (
              <div key={weekday} className="mb-0.5 grid grid-cols-[72px_repeat(24,1fr)] gap-0.5">
                <div className="truncate pr-2 text-xs text-[#9ca3af]">{weekday.slice(0, 3)}</div>
                {Array.from({ length: 24 }, (_, hour) => {
                  const count = byKey.get(`${weekday}:${hour}`) ?? 0;
                  const intensity = count / max;
                  const after = isAfterHoursHour(hour);
                  return (
                    <div
                      key={hour}
                      title={`${weekday} ${formatHour(hour)}: ${count} Bestellungen`}
                      className={cn(
                        "aspect-square min-h-[14px] rounded-sm",
                        after && count > 0 && "ring-1 ring-[#a855f7]/60",
                      )}
                      style={{
                        backgroundColor:
                          count === 0
                            ? "#1f2937"
                            : after
                              ? `rgba(168, 85, 247, ${0.25 + intensity * 0.75})`
                              : `rgba(99, 102, 241, ${0.15 + intensity * 0.65})`,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
