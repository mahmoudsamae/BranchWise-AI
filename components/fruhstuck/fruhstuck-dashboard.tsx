"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coffee, Loader2, RefreshCw, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  AfterHoursSection,
  ExecutiveKpiBar,
  PeakTimeSection,
} from "@/components/fruhstuck/insight-sections";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { addBerlinDays, berlinTodayYmd } from "@/lib/fruhstuck/berlin-range";
import { buildPortfolioInsights } from "@/lib/fruhstuck/portfolio-insights";
import { buildRangeSearchParams } from "@/lib/fruhstuck/range-params";
import type { BreakfastAnalyticsData, BreakfastRange, FruhstuckBranchPayload } from "@/lib/fruhstuck/types";
import { BREAKFAST_RANGES } from "@/lib/fruhstuck/types";

type RangeKind = "preset" | "custom" | "all";

const BRANCH_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const RANGE_LABELS: Record<BreakfastRange, string> = {
  today: "Today",
  yesterday: "Yesterday",
  last7days: "Last 7 days",
  last30days: "Last 30 days",
};

function formatEuro(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function highlightClass(value: number, min: number, max: number, higherIsBetter = true) {
  if (max === min) return "";
  if (higherIsBetter && value === max) return "bg-emerald-500/10";
  if (higherIsBetter && value === min) return "bg-red-500/10";
  if (!higherIsBetter && value === min) return "bg-emerald-500/10";
  if (!higherIsBetter && value === max) return "bg-red-500/10";
  return "";
}

function buildTrendSeries(branches: FruhstuckBranchPayload[]) {
  const byDate = new Map<string, Record<string, number>>();
  const names: string[] = [];

  for (const b of branches) {
    const days = b.raw_data?.timeAnalytics?.ordersByDay ?? [];
    if (!days.length) continue;
    names.push(b.branch_name);
    for (const point of days) {
      if (!byDate.has(point.date)) byDate.set(point.date, {});
      byDate.get(point.date)![b.branch_name] = point.count;
    }
  }

  const data = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => ({ date, ...values }));

  return { data, names };
}

function defaultCustomDates() {
  const today = berlinTodayYmd();
  return { start: addBerlinDays(today, -29), end: today };
}

export function FruhstuckDashboard() {
  const defaults = defaultCustomDates();
  const [rangeKind, setRangeKind] = useState<RangeKind>("preset");
  const [preset, setPreset] = useState<BreakfastRange>("last30days");
  const [customStart, setCustomStart] = useState(defaults.start);
  const [customEnd, setCustomEnd] = useState(defaults.end);
  const [rangeLabel, setRangeLabel] = useState("Last 30 days");
  const [branchId, setBranchId] = useState("all");
  const [branches, setBranches] = useState<{ id: string; name: string; external_id?: string | null }[]>([]);
  const [rows, setRows] = useState<FruhstuckBranchPayload[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState<boolean | null>(null);
  const [trendSeries, setTrendSeries] = useState<Record<string, string | number>[]>([]);
  const [trendBranches, setTrendBranches] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<FruhstuckBranchPayload | null>(null);

  const loadBranches = useCallback(async () => {
    const res = await fetch("/api/branches");
    if (!res.ok) return;
    const j = (await res.json()) as { branches?: { id: string; name: string; external_id?: string | null }[] };
    setBranches(j.branches ?? []);
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/fruhstuck/health");
      if (!res.ok) {
        setDbReady(false);
        return;
      }
      const h = (await res.json()) as {
        ready?: boolean;
        detail?: string | null;
        hints?: string[];
      };
      setDbReady(h.ready ?? false);
      if (!h.ready) {
        const parts = [h.detail, ...(h.hints ?? [])].filter(Boolean);
        if (parts.length) setLoadError(parts.join(" — "));
      }
    } catch {
      setDbReady(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (rangeKind === "custom" && (!customStart || !customEnd || customStart > customEnd)) {
      setLoadError("Choose a valid custom date range (start ≤ end)");
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
      if (branchId !== "all") p.set("branch_id", branchId);

      const mainRes = await fetch(`/api/fruhstuck/data?${p}`);

      if (!mainRes.ok) {
        const j = (await mainRes.json()) as { error?: string };
        setLoadError(j.error ?? "Failed to load breakfast data");
        setRows([]);
        return;
      }

      const j = (await mainRes.json()) as {
        branches?: FruhstuckBranchPayload[];
        errors?: { branch_name: string; message: string }[];
        warning?: string;
        range?: string;
      };

      if (j.range) setRangeLabel(j.range);

      if (j.warning) setLoadError(j.warning);
      else if (j.errors?.[0]) {
        const e0 = j.errors[0];
        setLoadError(`${e0.branch_name}: ${e0.message}`);
      }

      const list = j.branches ?? [];
      setRows(list);

      const trend = buildTrendSeries(list);
      setTrendSeries(trend.data);
      setTrendBranches(trend.names);
    } catch {
      setLoadError("Request failed — check BREAKFAST_SUPABASE_URL in server env");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [rangeKind, preset, customStart, customEnd, branchId]);

  useEffect(() => {
    void loadBranches();
    void checkHealth();
  }, [loadBranches, checkHealth]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sortedRows = useMemo(() => [...rows].sort((a, b) => b.orders_count - a.orders_count), [rows]);

  const insights = useMemo(
    () => (sortedRows.length > 0 ? buildPortfolioInsights(sortedRows) : null),
    [sortedRows],
  );

  const stats = useMemo(() => {
    const orders = sortedRows.map((r) => r.orders_count);
    return {
      minOrd: Math.min(...orders, 0),
      maxOrd: Math.max(...orders, 0),
    };
  }, [sortedRows]);

  const barData = useMemo(
    () => sortedRows.map((r) => ({ name: r.branch_name, orders: r.orders_count })),
    [sortedRows],
  );

  const detailRaw = detail?.raw_data as BreakfastAnalyticsData | undefined;

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-wrap items-start gap-3">
        <Coffee className="mt-1 size-8 text-[#a5b4fc]" aria-hidden />
        <div>
          <h1 className="text-3xl font-bold text-white">Frühstück Overview</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Live read-only data from breakfast-order Supabase
          </p>
        </div>
      </header>

      {dbReady === false ? (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Cannot connect to breakfast Supabase. Add{" "}
          <code className="text-red-100">BREAKFAST_SUPABASE_URL</code> and{" "}
          <code className="text-red-100">BREAKFAST_SUPABASE_SERVICE_ROLE_KEY</code> in .env.local (breakfast-order
          → Settings → API).
        </div>
      ) : null}

      {loadError ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {loadError}
        </div>
      ) : null}

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <Button type="button" variant="secondary" disabled={loading} onClick={() => void loadData()}>
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
            Refresh
          </Button>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm text-[#9ca3af]">
              Range
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
                <option value="custom">Custom range…</option>
                <option value="all">All time</option>
              </select>
            </label>

            {rangeKind === "custom" ? (
              <>
                <label className="text-sm text-[#9ca3af]">
                  From
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd || berlinTodayYmd()}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="mt-1 block rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
                  />
                </label>
                <label className="text-sm text-[#9ca3af]">
                  To
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
              Branch
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="mt-1 block min-w-[160px] rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              >
                <option value="all">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {!b.external_id ? " (no slug)" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      {insights && !loading ? (
        <div className="space-y-10">
          <ExecutiveKpiBar insights={insights} />
          <AfterHoursSection insights={insights} />
          <PeakTimeSection insights={insights} />
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-white">Branch overview — {rangeLabel}</h2>
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-[#9ca3af]">
            <Loader2 className="size-4 animate-spin" aria-hidden /> Loading…
          </p>
        ) : sortedRows.length === 0 ? (
          <p className="text-sm text-[#9ca3af]">
            No data. Set breakfast slug (external_id) on each branch under Branches → detail, then refresh.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sortedRows.map((r) => (
              <article key={r.branch_id} className="bw-card p-4">
                <h3 className="font-bold text-white">{r.branch_name}</h3>
                <p className="text-xs text-[var(--text-muted)]">Slug: {r.external_id}</p>
                <p className="mt-3 text-3xl font-bold text-[var(--accent-light)]">{r.orders_count}</p>
                <p className="text-xs text-[var(--text-muted)]">Bestellungen</p>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  Top: <span className="text-white">{r.top_product ?? "—"}</span>
                </p>
                <Button type="button" variant="secondary" className="mt-4 w-full text-sm" onClick={() => setDetail(r)}>
                  Details
                </Button>
              </article>
            ))}
          </div>
        )}
      </section>

      {sortedRows.length > 0 ? (
        <>
          <section className="overflow-x-auto bw-card">
            <h2 className="border-b border-[var(--border)] px-4 py-3 text-lg font-semibold text-white">Vergleich</h2>
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="px-4 py-3">Filiale</th>
                  <th className="px-4 py-3">Bestellungen</th>
                  <th className="px-4 py-3">Top-Produkt</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={r.branch_id} className="border-b border-[var(--border)]/60 text-[#e5e7eb]">
                    <td className="px-4 py-3 font-medium text-white">{r.branch_name}</td>
                    <td className={cn("px-4 py-3", highlightClass(r.orders_count, stats.minOrd, stats.maxOrd))}>
                      {r.orders_count}
                    </td>
                    <td className="px-4 py-3">{r.top_product ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="bw-card p-4">
              <h2 className="mb-4 text-lg font-semibold text-white">Bestellungen je Filiale</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
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
              <h2 className="mb-4 text-lg font-semibold text-white">Bestellungen pro Tag</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendSeries}>
                    <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 8 }} />
                    <Legend />
                    {trendBranches.map((name, i) => (
                      <Line
                        key={name}
                        type="monotone"
                        dataKey={name}
                        stroke={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#1f2937] bg-[#111827] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                {detail.branch_name} ({detail.external_id})
              </h3>
              <button type="button" onClick={() => setDetail(null)} className="text-[#9ca3af] hover:text-white">
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-[var(--text-muted)]">Bestellungen</p>
                <p className="text-xl font-bold text-white">{detail.orders_count}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Artikel verkauft</p>
                <p className="text-xl font-bold text-white">{detailRaw?.summary?.itemsSold ?? "—"}</p>
              </div>
            </div>

            <h4 className="mb-2 font-semibold text-white">Top-Produkte</h4>
            <table className="mb-6 w-full text-left text-sm">
              <thead className="text-xs uppercase text-[var(--text-muted)]">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-2">Produkt</th>
                  <th className="py-2">Stück</th>
                </tr>
              </thead>
              <tbody>
                {(detailRaw?.products?.productsBreakdown ?? []).map((item) => (
                  <tr key={item.name} className="border-b border-[var(--border)]/50 text-[#e5e7eb]">
                    <td className="py-2">{item.name}</td>
                    <td className="py-2">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h4 className="mb-2 font-semibold text-white">Orders by hour</h4>
            <div className="mb-6 grid grid-cols-4 gap-2 text-xs sm:grid-cols-6">
              {(detailRaw?.timeAnalytics?.ordersByHour ?? []).map((h) => (
                <div
                  key={h.hour}
                  className="rounded border border-[#1f2937] bg-[#0a0f1e]/50 px-2 py-1 text-center"
                >
                  <p className="text-[#6b7280]">{h.hour}:00</p>
                  <p className="font-bold text-white">{h.count}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={() => setDetail(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

