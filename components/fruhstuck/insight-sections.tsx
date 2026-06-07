"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { cn } from "@/lib/cn";
import { isAfterHoursHour, WEEKDAY_ORDER } from "@/lib/fruhstuck/constants";
import type { PortfolioInsights } from "@/lib/fruhstuck/portfolio-insights";

function formatEuro(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
      <p className="text-xs uppercase tracking-wide text-[#6b7280]">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", accent ? "text-[#a5b4fc]" : "text-white")}>{value}</p>
    </article>
  );
}

export function ExecutiveKpiBar({ insights }: { insights: PortfolioInsights }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-white">Executive summary</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total orders" value={String(insights.totalOrders)} />
        <KpiCard label="Total revenue" value={formatEuro(insights.totalRevenue)} accent />
        <KpiCard label="Avg order value" value={formatEuro(insights.averageOrderValue)} />
        <KpiCard label="Items sold" value={String(insights.totalItemsSold)} />
        <KpiCard label="Active branches" value={String(insights.activeBranches)} />
        <KpiCard label="Busiest branch" value={insights.busiestBranch ?? "—"} />
      </div>
    </section>
  );
}

export function AfterHoursSection({ insights }: { insights: PortfolioInsights }) {
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
        <h2 className="text-lg font-semibold text-white">After-Hours Orders (18:00 – 21:00)</h2>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Kitchen closes at 18:00; orders still accepted until 21:00 — staff-off productivity window.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="After-hours orders" value={String(ah.orders)} />
        <KpiCard label="After-hours revenue" value={formatEuro(ah.revenue)} accent />
        <KpiCard label="% of total orders" value={`${ah.pctOfOrders}%`} />
        <KpiCard label="Avg after-hours order" value={formatEuro(ah.averageOrderValue)} />
      </div>

      <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <h3 className="mb-4 text-base font-semibold text-white">Order Distribution by Hour</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} interval={1} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }}
                formatter={(v) => [v, "Orders"]}
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
          <span className="inline-block size-2 rounded-sm bg-[#a855f7]" /> 18:00–21:00 (after-hours) &nbsp;
          <span className="inline-block size-2 rounded-sm bg-[#4b5563]" /> other hours
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1f2937] bg-[#111827]">
        <h3 className="border-b border-[#1f2937] px-4 py-3 text-base font-semibold text-white">
          After-hours by branch
        </h3>
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs uppercase text-[#6b7280]">
            <tr className="border-b border-[#1f2937]">
              <th className="px-4 py-3">Branch</th>
              <th className="px-4 py-3">After-hours orders</th>
              <th className="px-4 py-3">After-hours revenue</th>
              <th className="px-4 py-3">% of branch total</th>
            </tr>
          </thead>
          <tbody>
            {insights.afterHoursByBranch.map((b) => (
              <tr key={b.branchId} className="border-b border-[#1f2937]/60 text-[#e5e7eb]">
                <td className="px-4 py-3 font-medium text-white">{b.branchName}</td>
                <td className="px-4 py-3">{b.orders}</td>
                <td className="px-4 py-3">{formatEuro(b.revenue)}</td>
                <td className="px-4 py-3">{b.pctOfBranchOrders}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HeatmapGrid({ heatmap }: { heatmap: PortfolioInsights["heatmap"] }) {
  const max = Math.max(...heatmap.map((c) => c.count), 1);
  const byKey = new Map(heatmap.map((c) => [`${c.weekday}:${c.hour}`, c.count]));

  return (
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
                  title={`${weekday} ${formatHour(hour)}: ${count} orders`}
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
  );
}

export function PeakTimeSection({ insights }: { insights: PortfolioInsights }) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Peak Time Analysis</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Peak order hour"
          value={insights.peakOrderHour != null ? formatHour(insights.peakOrderHour) : "—"}
        />
        <KpiCard
          label="Peak revenue hour"
          value={insights.peakRevenueHour != null ? formatHour(insights.peakRevenueHour) : "—"}
          accent
        />
        <KpiCard label="Busiest weekday" value={insights.peakWeekday ?? "—"} />
        <KpiCard label="Slowest weekday" value={insights.slowestWeekday ?? "—"} />
      </div>

      <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <h3 className="mb-4 text-base font-semibold text-white">Orders by weekday</h3>
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
                formatter={(v, name) => [v, name === "orders" ? "Orders" : "Revenue"]}
              />
              <Bar dataKey="orders" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <h3 className="mb-2 text-base font-semibold text-white">Order heatmap (weekday × hour)</h3>
        <p className="mb-4 text-xs text-[#6b7280]">Darker = more orders. Purple ring = after-hours (18:00–21:00).</p>
        <HeatmapGrid heatmap={insights.heatmap} />
      </div>
    </section>
  );
}
