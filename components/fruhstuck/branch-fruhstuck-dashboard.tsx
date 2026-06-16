"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coffee, Loader2, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  BranchAfterHoursSection,
  BranchKpiBar,
  BranchOperationsBar,
  BranchPeakTimeSection,
  BranchProductsSection,
  BranchRevenueTrend,
} from "@/components/fruhstuck/branch-insight-sections";
import { Button } from "@/components/ui/Button";
import { addBerlinDays, berlinTodayYmd } from "@/lib/fruhstuck/berlin-range";
import type { BranchBreakfastPayload } from "@/lib/fruhstuck/load-branch-breakfast";
import { buildPortfolioInsights } from "@/lib/fruhstuck/portfolio-insights";
import { buildRangeSearchParams } from "@/lib/fruhstuck/range-params";
import type { BreakfastRange } from "@/lib/fruhstuck/types";
import { BREAKFAST_RANGES } from "@/lib/fruhstuck/types";

type RangeKind = "preset" | "custom" | "all";
type CompareMode = "" | "wow" | "mom" | "yoy";

const RANGE_LABELS: Record<BreakfastRange, string> = {
  today: "Heute",
  yesterday: "Gestern",
  last7days: "Letzte 7 Tage",
  last30days: "Letzte 30 Tage",
};

const COMPARE_LABELS: Record<Exclude<CompareMode, "">, string> = {
  wow: "Woche vs. Woche",
  mom: "Monat vs. Monat",
  yoy: "Jahr vs. Jahr",
};

function formatEuro(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function defaultCustomDates() {
  const today = berlinTodayYmd();
  return { start: addBerlinDays(today, -29), end: today };
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
      <p className="text-xs uppercase tracking-wide text-[#6b7280]">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent ? "text-[#a5b4fc]" : "text-white"}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#6b7280]">{sub}</p> : null}
    </article>
  );
}

export function BranchFruhstuckDashboard() {
  const defaults = defaultCustomDates();
  const [rangeKind, setRangeKind] = useState<RangeKind>("all");
  const [preset, setPreset] = useState<BreakfastRange>("last30days");
  const [customStart, setCustomStart] = useState(defaults.start);
  const [customEnd, setCustomEnd] = useState(defaults.end);
  const [rangeLabel, setRangeLabel] = useState("Gesamter Zeitraum");
  const [compare, setCompare] = useState<CompareMode>("");
  const [payload, setPayload] = useState<BranchBreakfastPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (rangeKind === "custom" && (!customStart || !customEnd || customStart > customEnd)) {
      setLoadError("Bitte einen gültigen Zeitraum wählen (Start ≤ Ende).");
      return;
    }

    setLoading(true);
    setLoadError(null);
    try {
      const p = buildRangeSearchParams({
        kind: rangeKind,
        preset: rangeKind === "preset" ? preset : undefined,
        startYmd: rangeKind === "custom" ? customStart : undefined,
        endYmd: rangeKind === "custom" ? customEnd : undefined,
      });
      if (compare) p.set("compare", compare);

      const res = await fetch(`/api/branch/fruhstuck?${p}`);
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setLoadError(j.error ?? "Frühstücksdaten konnten nicht geladen werden.");
        setPayload(null);
        return;
      }

      const data = (await res.json()) as BranchBreakfastPayload;
      setPayload(data);
      if (data.range) setRangeLabel(data.range);
    } catch {
      setLoadError("Verbindungsfehler — bitte später erneut versuchen.");
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [rangeKind, preset, customStart, customEnd, compare]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const insights = useMemo(
    () => (payload?.branch ? buildPortfolioInsights([payload.branch]) : null),
    [payload],
  );

  const raw = payload?.branch.raw_data;
  const hasData = (payload?.branch.orders_count ?? 0) > 0;

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-wrap items-start gap-3">
        <Coffee className="mt-1 size-8 text-[#a5b4fc]" aria-hidden />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold text-white">Frühstück</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {payload?.branch.branch_name ?? "Dein Standort"} — Bestellungen, Umsatz & Kennzahlen
          </p>
        </div>
      </header>

      {loadError ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {loadError}
        </div>
      ) : null}

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-[#6b7280]">Zeitraum (Analyse)</p>
            <p className="mt-0.5 text-sm font-medium text-white">{rangeLabel}</p>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Button type="button" variant="secondary" disabled={loading} onClick={() => void loadData()}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RefreshCw className="size-4" aria-hidden />
              )}
              Aktualisieren
            </Button>

            <label className="text-sm text-[#9ca3af]">
              Auswahl
              <select
                value={rangeKind === "preset" ? `preset:${preset}` : rangeKind}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "all") {
                    setRangeKind("all");
                    return;
                  }
                  if (v === "custom") {
                    setRangeKind("custom");
                    return;
                  }
                  setRangeKind("preset");
                  setPreset(v.replace("preset:", "") as BreakfastRange);
                }}
                className="mt-1 block min-w-[160px] rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              >
                {BREAKFAST_RANGES.map((r) => (
                  <option key={r} value={`preset:${r}`}>
                    {RANGE_LABELS[r]}
                  </option>
                ))}
                <option value="custom">Benutzerdefiniert…</option>
                <option value="all">Gesamter Zeitraum</option>
              </select>
            </label>

            {rangeKind === "custom" ? (
              <>
                <label className="text-sm text-[#9ca3af]">
                  Von
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd || berlinTodayYmd()}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1 block rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="text-sm text-[#9ca3af]">
                  Bis
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart}
                    max={berlinTodayYmd()}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="mt-1 block rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
                  />
                </label>
              </>
            ) : null}

            <label className="text-sm text-[#9ca3af]">
              Vergleich
              <select
                value={compare}
                onChange={(e) => setCompare(e.target.value as CompareMode)}
                className="mt-1 block min-w-[180px] rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              >
                <option value="">Kein Vergleich</option>
                <option value="wow">Woche vs. Woche</option>
                <option value="mom">Monat vs. Monat</option>
                <option value="yoy">Jahr vs. Jahr</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-[#9ca3af]">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Daten werden geladen…
        </p>
      ) : null}

      {!loading && payload && !hasData && !loadError ? (
        <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-8 text-center">
          <Coffee className="mx-auto size-10 text-[#4b5563]" aria-hidden />
          <p className="mt-4 text-lg font-medium text-white">Keine Bestellungen im gewählten Zeitraum</p>
          <p className="mt-2 text-sm text-[#9ca3af]">
            Wähle einen anderen Zeitraum oder prüfe den Frühstücks-Slug (
            <code className="text-[#a5b4fc]">{payload.branch.external_id}</code>).
          </p>
        </div>
      ) : null}

      {!loading && payload && insights && raw && hasData ? (
        <div className="space-y-10">
          <BranchOperationsBar ops={payload.operations} />

          <BranchKpiBar insights={insights} comparison={payload.comparison} />

          <BranchRevenueTrend raw={raw} />

          <BranchAfterHoursSection insights={insights} />

          <BranchPeakTimeSection insights={insights} />

          <BranchProductsSection raw={raw} />

          {payload.period_comparison ? (
            <section className="space-y-4 rounded-xl border border-[#1f2937] bg-[#111827] p-4">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Vergleich — {COMPARE_LABELS[payload.period_comparison.mode]}
                </h2>
                <p className="mt-1 text-sm text-[#9ca3af]">{payload.period_comparison.label}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard
                  label="Aktuell"
                  value={`${payload.period_comparison.current.orders} Best.`}
                  sub={formatEuro(payload.period_comparison.current.revenue)}
                />
                <KpiCard
                  label="Vorperiode"
                  value={`${payload.period_comparison.previous.orders} Best.`}
                  sub={formatEuro(payload.period_comparison.previous.revenue)}
                  accent
                />
                <KpiCard
                  label="Δ Bestellungen"
                  value={
                    payload.period_comparison.orders_pct != null
                      ? `${payload.period_comparison.orders_pct > 0 ? "+" : ""}${payload.period_comparison.orders_pct}%`
                      : "—"
                  }
                />
                <KpiCard
                  label="Δ Umsatz"
                  value={
                    payload.period_comparison.revenue_pct != null
                      ? `${payload.period_comparison.revenue_pct > 0 ? "+" : ""}${payload.period_comparison.revenue_pct}%`
                      : "—"
                  }
                />
              </div>

              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payload.period_comparison.chart}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }} />
                    <Legend />
                    <Bar dataKey="current" name="Aktuell" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="previous" name="Vorperiode" fill="#4b5563" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
