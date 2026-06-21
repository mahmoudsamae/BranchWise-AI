"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { cn } from "@/lib/cn";
import { isAfterHoursHour, WEEKDAY_ORDER } from "@/lib/fruhstuck/constants";
import type { PortfolioInsights } from "@/lib/fruhstuck/portfolio-insights";

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <article className="bw-card p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold", accent ? "text-[var(--accent-light)]" : "text-white")}>{value}</p>
    </article>
  );
}

export function ExecutiveKpiBar({ insights }: { insights: PortfolioInsights }) {
  return (
    <section>
      <h2 className="bw-section-title mb-3">Übersicht</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Bestellungen gesamt" value={String(insights.totalOrders)} accent />
        <KpiCard label="Artikel verkauft" value={String(insights.totalItemsSold)} />
        <KpiCard label="Aktive Filialen" value={String(insights.activeBranches)} />
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
        <h2 className="bw-section-title">Nach-Feierabend (18:00 – 21:00)</h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Küche schließt 18:00 — Bestellungen bis 21:00 zeigen die Belastung außerhalb der Kernschicht.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <KpiCard label="Bestellungen nach Feierabend" value={String(ah.orders)} accent />
        <KpiCard label="Anteil Gesamt" value={`${ah.pctOfOrders}%`} />
      </div>

      <div className="bw-card p-4">
        <h3 className="mb-4 text-base font-semibold text-white">Bestellungen nach Uhrzeit</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "var(--text-secondary)", fontSize: 10 }} interval={1} />
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }}
                formatter={(v) => [v, "Bestellungen"]}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.hour} fill={entry.isAfterHours ? "var(--accent-2)" : "#4b5563"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          <span className="inline-block size-2 rounded-sm bg-[var(--accent-2)]" /> 18:00–21:00 &nbsp;
          <span className="inline-block size-2 rounded-sm bg-[#4b5563]" /> Kernzeiten
        </p>
      </div>

      <div className="overflow-x-auto bw-card">
        <h3 className="border-b border-[var(--border)] px-4 py-3 text-base font-semibold text-white">
          Nach-Feierabend je Filiale
        </h3>
        <table className="w-full min-w-[420px] text-left text-sm">
          <thead className="text-xs uppercase text-[var(--text-muted)]">
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-3">Filiale</th>
              <th className="px-4 py-3">Bestellungen</th>
              <th className="px-4 py-3">Anteil Filiale</th>
            </tr>
          </thead>
          <tbody>
            {insights.afterHoursByBranch.map((b) => (
              <tr key={b.branchId} className="border-b border-[var(--border)]/60 text-[#e5e7eb]">
                <td className="px-4 py-3 font-medium text-white">{b.branchName}</td>
                <td className="px-4 py-3">{b.orders}</td>
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
        <div className="mb-1 grid grid-cols-[72px_repeat(24,1fr)] gap-0.5 text-[10px] text-[var(--text-muted)]">
          <div />
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="text-center">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {WEEKDAY_ORDER.map((weekday) => (
          <div key={weekday} className="mb-0.5 grid grid-cols-[72px_repeat(24,1fr)] gap-0.5">
            <div className="truncate pr-2 text-xs text-[var(--text-secondary)]">{weekday.slice(0, 3)}</div>
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
                    after && count > 0 && "ring-1 ring-[var(--accent-2)]/60",
                  )}
                  style={{
                    backgroundColor:
                      count === 0
                        ? "var(--bg-elevated)"
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
      <h2 className="bw-section-title">Stoßzeiten</h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Stoßzeit Bestellungen"
          value={insights.peakOrderHour != null ? formatHour(insights.peakOrderHour) : "—"}
          accent
        />
        <KpiCard label="Stärkster Wochentag" value={insights.peakWeekday ?? "—"} />
        <KpiCard label="Schwächster Wochentag" value={insights.slowestWeekday ?? "—"} />
      </div>

      <div className="bw-card p-4">
        <h3 className="mb-4 text-base font-semibold text-white">Bestellungen nach Wochentag</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={insights.weekdayChart}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis
                dataKey="weekday"
                tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                tickFormatter={(v) => String(v).slice(0, 3)}
              />
              <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8 }}
                formatter={(v) => [v, "Bestellungen"]}
              />
              <Bar dataKey="orders" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bw-card p-4">
        <h3 className="mb-2 text-base font-semibold text-white">Heatmap (Wochentag × Uhrzeit)</h3>
        <p className="mb-4 text-xs text-[var(--text-muted)]">
          Dunkler = mehr Bestellungen. Lila = Nach-Feierabend (18:00–21:00).
        </p>
        <HeatmapGrid heatmap={insights.heatmap} />
      </div>
    </section>
  );
}
