"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { KpiCard } from "@/components/dashboard/kpi-card";
import { Button } from "@/components/ui/Button";
import { Skeleton, SkeletonCard, SkeletonStat } from "@/components/ui/Skeleton";
import { trendPct } from "@/lib/gm-hr/analytics-period";
import type { BranchKpiRow, KpiSummary } from "@/lib/gm-hr/analytics-service";

const BRANCH_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

type PeriodKey = "week" | "month" | "3months" | "custom";

function occTone(v: number) {
  if (v > 75) return "green" as const;
  if (v >= 50) return "orange" as const;
  return "red" as const;
}

function barFillOccupancy(v: number) {
  if (v > 80) return "#10b981";
  if (v >= 60) return "#f59e0b";
  return "#ef4444";
}

function barFillRate(v: number) {
  if (v >= 80) return "#10b981";
  if (v >= 50) return "#f59e0b";
  return "#ef4444";
}

export function AnalyticsDashboard({ mode }: { mode: "gm" | "hr" }) {
  const [period, setPeriod] = useState<PeriodKey>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);

  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [prevSummary, setPrevSummary] = useState<KpiSummary | null>(null);
  const [byBranch, setByBranch] = useState<BranchKpiRow[]>([]);
  const [trends, setTrends] = useState<{
    trends: { week: string; branch_id: string; branch_name: string; occupancy_rate: number }[];
    feedback_trend: { week: string; positive: number; negative: number }[];
    issues_trend: { week: string; repeated_issues: number; support_needed: number; unpaid_departures: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submissionRates, setSubmissionRates] = useState<{ branch_name: string; rate: number }[]>([]);
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareData, setCompareData] = useState<
    {
      branch_name: string;
      avg_occupancy: number;
      total_negative_feedback: number;
      reports_submitted: number;
      radar: Record<string, number>;
    }[]
  >([]);
  const [radarIds, setRadarIds] = useState<string[]>([]);

  const query = useMemo(() => {
    const p = new URLSearchParams({ period, branch_id: branchId });
    if (period === "custom") {
      if (customStart) p.set("start", customStart);
      if (customEnd) p.set("end", customEnd);
    }
    return p.toString();
  }, [period, branchId, customStart, customEnd]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiRes, trendRes, subRes, insightRes] = await Promise.all([
        fetch(`/api/analytics/kpis?${query}`),
        fetch(`/api/analytics/trends?${query}`),
        fetch(`/api/analytics/submission-rate`),
        fetch(`/api/analytics/ai-insight?branch_id=${branchId}`),
      ]);
      if (kpiRes.ok) {
        const j = await kpiRes.json();
        setSummary(j.summary);
        setPrevSummary(j.previous_period);
        setByBranch(j.by_branch ?? []);
      }
      if (trendRes.ok) setTrends(await trendRes.json());
      if (subRes.ok) {
        const j = await subRes.json();
        setSubmissionRates(j.rates ?? []);
      }
      if (insightRes.ok) {
        const j = await insightRes.json();
        if (j.insight) setInsight(j.insight);
      }
    } finally {
      setLoading(false);
    }
  }, [query, branchId]);

  useEffect(() => {
    void fetch("/api/branches")
      .then((r) => r.json())
      .then((j: { branches?: { id: string; name: string }[] }) => {
        const list = j.branches ?? [];
        setBranches(list);
        setRadarIds(list.slice(0, 4).map((b) => b.id));
        setCompareIds(list.slice(0, 3).map((b) => b.id));
      });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshInsight = async () => {
    setLoadingInsight(true);
    try {
      const res = await fetch("/api/analytics/ai-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          branch_id: branchId,
          start: customStart,
          end: customEnd,
        }),
      });
      const j = await res.json();
      if (j.insight) setInsight(j.insight);
    } finally {
      setLoadingInsight(false);
    }
  };

  const loadComparison = async () => {
    if (compareIds.length < 2) return;
    const res = await fetch(`/api/analytics/comparison?branches=${compareIds.join(",")}`);
    if (res.ok) {
      const j = await res.json();
      setCompareData(j.branches ?? []);
    }
  };

  const hasData = useMemo(
    () =>
      (summary?.reports_submitted ?? 0) > 0 ||
      byBranch.some((b) => (b.occupancy_rate ?? b.avg_occupancy) > 0),
    [summary, byBranch],
  );

  const occupancyBars = useMemo(
    () =>
      byBranch.map((b) => ({
        name: b.branch_name,
        occupancy: b.occupancy_rate ?? b.avg_occupancy,
      })),
    [byBranch],
  );

  const radarChartData = useMemo(() => {
    const selected = byBranch.filter((x) => radarIds.includes(x.branch_id)).slice(0, 4);
    if (selected.length === 0) return [];

    const maxPos = Math.max(...selected.map((b) => b.positive_feedback), 1);
    const maxIssues = Math.max(...selected.map((b) => b.repeated_issues), 1);
    const maxSupport = Math.max(...selected.map((b) => b.support_needed), 1);

    const axes = ["Occupancy", "Positive", "Issues", "Support"] as const;
    return axes.map((metric) => {
      const row: Record<string, string | number> = { metric };
      for (const b of selected) {
        const occ = b.occupancy_rate ?? b.avg_occupancy;
        if (metric === "Occupancy") row[b.branch_name] = Math.min(100, Math.round(occ));
        else if (metric === "Positive") row[b.branch_name] = Math.round((b.positive_feedback / maxPos) * 100);
        else if (metric === "Issues")
          row[b.branch_name] = Math.max(0, 100 - Math.round((b.repeated_issues / maxIssues) * 100));
        else row[b.branch_name] = Math.max(0, 100 - Math.round((b.support_needed / maxSupport) * 100));
      }
      return row;
    });
  }, [byBranch, radarIds]);

  const negTrend = trendPct(summary?.total_negative_feedback ?? 0, prevSummary?.total_negative_feedback ?? 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Analytics & KPIs</h1>
        <Button type="button" variant="secondary" onClick={() => setCompareOpen(true)}>
          Compare branches
        </Button>
      </div>

      <div className="sticky top-0 z-20 -mx-2 flex flex-wrap items-end gap-3 rounded-xl border border-[#1f2937] bg-[#0a0f1e]/95 p-4 backdrop-blur">
        <div className="grid gap-1">
          <span className="text-xs text-[#9ca3af]">Period</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodKey)}
            className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white"
          >
            <option value="week">This week</option>
            <option value="month">Last 4 weeks</option>
            <option value="3months">Last 3 months</option>
            <option value="custom">Custom range</option>
          </select>
        </div>
        {period === "custom" ? (
          <>
            <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white" />
            <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white" />
          </>
        ) : null}
        <div className="grid gap-1">
          <span className="text-xs text-[#9ca3af]">Branch</span>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white">
            <option value="all">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" onClick={() => void load()}>
          Apply filters
        </Button>
      </div>

      <section className="rounded-xl border border-[#6366f1]/40 bg-[#6366f1]/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-[#a5b4fc]" aria-hidden />
            <h2 className="font-semibold text-white">AI weekly insight</h2>
          </div>
          <Button type="button" variant="secondary" disabled={loadingInsight} onClick={() => void refreshInsight()}>
            {loadingInsight ? "Refreshing…" : "Refresh insight"}
          </Button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-[#e5e7eb]">
          {insight ?? "Generate an insight from your latest KPI data."}
        </p>
      </section>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonStat key={i} />
          ))}
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Avg occupancy" value={`${summary.avg_occupancy}%`} tone={occTone(summary.avg_occupancy)} />
            <KpiCard label="Negative feedback" value={summary.total_negative_feedback} tone="red" sub={negTrend?.text} />
            <KpiCard label="Unpaid departures" value={summary.unpaid_departures} tone="orange" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Positive feedback" value={summary.positive_feedback} tone="green" />
            <KpiCard label="Repeated issues" value={summary.repeated_issues} tone="red" />
            <KpiCard label="Support needed" value={summary.support_needed} tone="orange" />
            <KpiCard label="Reports submitted" value={summary.reports_submitted} tone="blue" />
          </div>
        </>
      ) : (
        <p className="text-[#9ca3af]">Could not load KPI summary.</p>
      )}

      <ChartCard title="Branch occupancy %">
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !hasData || occupancyBars.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
          <BarChart data={occupancyBars}>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="#9ca3af" />
            <ReferenceLine y={60} stroke="#ef4444" strokeDasharray="4 4" />
            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="4 4" />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937" }} />
            <Bar dataKey="occupancy">
              {occupancyBars.map((entry, index) => (
                <Cell key={`occ-${index}`} fill={barFillOccupancy(entry.occupancy)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Feedback trends">
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !trends?.feedback_trend?.length ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trends.feedback_trend}>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="week" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937" }} />
            <Legend />
            <Bar dataKey="positive" stackId="a" fill="#10b981" />
            <Bar dataKey="negative" stackId="a" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Branch performance radar">
        <div className="mb-3 flex flex-wrap gap-2">
          {branches.map((b) => (
            <label key={b.id} className="flex items-center gap-1 text-xs text-[#9ca3af]">
              <input
                type="checkbox"
                checked={radarIds.includes(b.id)}
                disabled={!radarIds.includes(b.id) && radarIds.length >= 4}
                onChange={(e) => {
                  setRadarIds((prev) =>
                    e.target.checked ? [...prev, b.id].slice(0, 4) : prev.filter((id) => id !== b.id),
                  );
                }}
              />
              {b.name}
            </label>
          ))}
        </div>
        {loading ? (
          <Skeleton className="h-[320px] w-full" />
        ) : !hasData || radarChartData.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart data={radarChartData}>
              <PolarGrid stroke="#374151" />
              <PolarAngleAxis dataKey="metric" stroke="#9ca3af" />
              {byBranch
                .filter((b) => radarIds.includes(b.branch_id))
                .slice(0, 4)
                .map((b, i) => (
                  <Radar key={b.branch_id} name={b.branch_name} dataKey={b.branch_name} stroke={BRANCH_COLORS[i]} fill={BRANCH_COLORS[i]} fillOpacity={0.2} />
                ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Operational issues over time">
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : !trends?.issues_trend?.length ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={trends.issues_trend}>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="week" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937" }} />
            <Area type="monotone" dataKey="repeated_issues" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
            <Area type="monotone" dataKey="support_needed" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
            <Area type="monotone" dataKey="unpaid_departures" stackId="1" stroke="#eab308" fill="#eab308" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Report submission rate by branch">
        {loading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : submissionRates.length === 0 ? (
          <ChartEmpty />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
          <BarChart data={submissionRates}>
            <CartesianGrid stroke="#1f2937" />
            <XAxis dataKey="branch_name" stroke="#9ca3af" fontSize={11} />
            <YAxis domain={[0, 100]} stroke="#9ca3af" />
            <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937" }} formatter={(v) => [`${v}%`, "On-time rate"]} />
            <Bar dataKey="rate">
              {submissionRates.map((entry, index) => (
                <Cell key={`sub-${index}`} fill={barFillRate(entry.rate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        )}
      </ChartCard>

      {compareOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-12">
          <div className="w-full max-w-5xl rounded-2xl border border-[#1f2937] bg-[#111827] p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Compare branches</h2>
              <Button type="button" variant="ghost" onClick={() => setCompareOpen(false)}>
                Close
              </Button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {branches.map((b) => (
                <label key={b.id} className="flex items-center gap-1 text-sm text-[#d1d5db]">
                  <input
                    type="checkbox"
                    checked={compareIds.includes(b.id)}
                    disabled={!compareIds.includes(b.id) && compareIds.length >= 6}
                    onChange={(e) =>
                      setCompareIds((prev) =>
                        e.target.checked ? [...prev, b.id].slice(0, 6) : prev.filter((id) => id !== b.id),
                      )
                    }
                  />
                  {b.name}
                </label>
              ))}
            </div>
            <Button type="button" className="mt-3" onClick={() => void loadComparison()}>
              Load comparison
            </Button>
            {compareData.length > 0 ? (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm text-left text-[#e5e7eb]">
                  <thead>
                    <tr className="border-b border-[#1f2937] text-[#9ca3af]">
                      <th className="py-2 pr-4">Metric</th>
                      {compareData.map((b) => (
                        <th key={b.branch_name} className="py-2 pr-4">
                          {b.branch_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(["avg_occupancy", "total_negative_feedback", "reports_submitted"] as const).map((metric) => {
                      const vals = compareData.map((b) => Number(b[metric as keyof typeof b] ?? 0));
                      const best = Math.max(...vals);
                      const worst = Math.min(...vals);
                      return (
                        <tr key={metric} className="border-b border-[#1f2937]/60">
                          <td className="py-2 pr-4 capitalize">{metric.replace(/_/g, " ")}</td>
                          {compareData.map((b) => {
                            const v = Number(b[metric as keyof typeof b] ?? 0);
                            const cls = v === best && best !== worst ? "text-emerald-400" : v === worst && best !== worst ? "text-red-400" : "";
                            return (
                              <td key={b.branch_name} className={`py-2 pr-4 ${cls}`}>
                                {v}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-5">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

function ChartEmpty() {
  return (
    <p className="flex h-[300px] items-center justify-center text-center text-sm text-[#9ca3af]">
      No data yet — submit reports to see analytics
    </p>
  );
}
