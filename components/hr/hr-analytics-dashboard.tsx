"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/Button";
import type { HrAnalyticsPayload } from "@/lib/hr/analytics-service";
import { branchShortLabel } from "@/lib/staff/branch-abbrev";

const OVERTIME_THRESHOLD = 15;
const CHART_HEIGHT = 200;
const CHART_MARGIN = { top: 4, right: 8, left: 0, bottom: 0 };

type PeriodKind = "week" | "month" | "custom";

function overtimeBarColor(hours: number) {
  if (hours > OVERTIME_THRESHOLD) return "#ef4444";
  if (hours >= 10) return "#eab308";
  return "#22c55e";
}

export function HrAnalyticsDashboard() {
  const [period, setPeriod] = useState<PeriodKind>("week");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [data, setData] = useState<HrAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/branches")
      .then((r) => r.json())
      .then((j: { branches?: { id: string; name: string }[] }) => setBranches(j.branches ?? []));
  }, []);

  const load = useCallback(async () => {
    if (period === "custom" && (!customStart || !customEnd)) {
      setError("Select start and end dates for custom period");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams({ period });
      if (period === "custom") {
        p.set("start_date", customStart);
        p.set("end_date", customEnd);
      }
      if (branchId !== "all") p.set("branch_id", branchId);

      const res = await fetch(`/api/hr/analytics?${p}`);
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Failed to load analytics");
        setData(null);
        return;
      }
      setData((await res.json()) as HrAnalyticsPayload);
    } catch {
      setError("Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const moraleChartData = useMemo(
    () =>
      (data?.morale_by_week ?? []).map((w) => ({
        week: w.week,
        Good: w.good,
        Neutral: w.neutral,
        Poor: w.poor,
      })),
    [data],
  );

  const overtimeChartData = useMemo(
    () =>
      (data?.overtime_by_branch ?? []).map((b) => ({
        ...b,
        branch_short: branchShortLabel(b.branch_name),
      })),
    [data],
  );

  const workloadChartData = useMemo(
    () =>
      (data?.workload_by_branch ?? []).map((b) => ({
        ...b,
        branch_short: branchShortLabel(b.branch_name),
      })),
    [data],
  );

  const topOvertime = data?.top_overtime_staff ?? [];
  const topAbsences = data?.top_absences_staff ?? [];

  const hasMetrics =
    data &&
    (data.kpis.total_overtime_hours > 0 ||
      data.kpis.total_absences > 0 ||
      data.kpis.total_late_arrivals > 0);

  return (
    <div className="bw-scrollbar space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">HR Analytics</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Staff metrics — {data?.period_label ?? "loading…"}
          </p>
        </div>
        <Button type="button" variant="secondary" disabled={loading} onClick={() => void load()}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </header>

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm text-[#9ca3af]">
            Period
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as PeriodKind)}
              className="mt-1 block min-w-[140px] rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
            >
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="custom">Custom range</option>
            </select>
          </label>
          {period === "custom" ? (
            <>
              <label className="text-sm text-[#9ca3af]">
                From
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="mt-1 block rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="text-sm text-[#9ca3af]">
                To
                <input
                  type="date"
                  value={customEnd}
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
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <p className="flex items-center gap-2 text-sm text-[#9ca3af]">
          <Loader2 className="size-4 animate-spin" /> Loading…
        </p>
      ) : null}

      {data && !hasMetrics ? (
        <div className="rounded-xl border border-[#1f2937] bg-[#111827] px-4 py-8 text-center">
          <p className="text-sm font-medium text-white">No staff metrics in this period</p>
          <p className="mt-1 text-xs text-[#9ca3af]">
            Try a longer range (e.g. Last 30 days) or wait until branches submit HR reports with staff entries.
          </p>
        </div>
      ) : null}

      {data && hasMetrics ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
              <p className="text-xs uppercase text-[#6b7280]">Total overtime (h)</p>
              <p className="mt-1 text-3xl font-bold text-white">{data.kpis.total_overtime_hours}</p>
            </article>
            <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
              <p className="text-xs uppercase text-[#6b7280]">Total absences</p>
              <p className="mt-1 text-3xl font-bold text-white">{data.kpis.total_absences}</p>
            </article>
            <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
              <p className="text-xs uppercase text-[#6b7280]">Late arrivals</p>
              <p className="mt-1 text-3xl font-bold text-white">{data.kpis.total_late_arrivals}</p>
            </article>
            <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
              <p className="text-xs uppercase text-[#6b7280]">Top overtime</p>
              <p className="mt-1 text-lg font-bold text-white">
                {data.kpis.top_overtime_staff
                  ? `${data.kpis.top_overtime_staff.name} (${data.kpis.top_overtime_staff.hours}h)`
                  : "—"}
              </p>
              {data.kpis.top_overtime_staff ? (
                <p className="text-xs text-[#9ca3af]">{data.kpis.top_overtime_staff.branch_name}</p>
              ) : null}
            </article>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-3">
              <h2 className="mb-2 text-sm font-semibold text-white">Overtime by branch</h2>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={overtimeChartData} margin={CHART_MARGIN}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="branch_short"
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} width={32} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #1f2937", fontSize: 12 }}
                    labelFormatter={(_, payload) =>
                      (payload?.[0]?.payload as { branch_name?: string })?.branch_name ?? ""
                    }
                  />
                  <ReferenceLine y={OVERTIME_THRESHOLD} stroke="#ef4444" strokeDasharray="4 4" />
                  <Bar dataKey="overtime_hours" radius={[3, 3, 0, 0]}>
                    {overtimeChartData.map((entry) => (
                      <Cell key={entry.branch_name} fill={overtimeBarColor(entry.overtime_hours)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-3">
              <h2 className="mb-2 text-sm font-semibold text-white">Attendance trend</h2>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <LineChart data={data.attendance_trend} margin={CHART_MARGIN}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} width={28} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="absences" stroke="#6366f1" strokeWidth={2} dot={false} name="Absences" />
                  <Line
                    type="monotone"
                    dataKey="late_arrivals"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                    name="Late"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-3">
              <h2 className="mb-2 text-sm font-semibold text-white">Morale by week</h2>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={moraleChartData} margin={CHART_MARGIN}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} width={28} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Good" stackId="m" fill="#22c55e" />
                  <Bar dataKey="Neutral" stackId="m" fill="#eab308" />
                  <Bar dataKey="Poor" stackId="m" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-3">
              <h2 className="mb-2 text-sm font-semibold text-white">Workload by branch</h2>
              <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
                <BarChart data={workloadChartData} margin={CHART_MARGIN}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="branch_short"
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} width={32} />
                  <Tooltip
                    contentStyle={{ background: "#111827", border: "1px solid #1f2937", fontSize: 12 }}
                    labelFormatter={(_, payload) =>
                      (payload?.[0]?.payload as { branch_name?: string })?.branch_name ?? ""
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="hours_worked" fill="#6366f1" name="Hours" />
                  <Bar dataKey="overtime_hours" fill="#ef4444" name="OT" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-3">
              <h2 className="mb-3 text-sm font-semibold text-white">Top overtime (staff)</h2>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-[#6b7280]">
                  <tr>
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Branch</th>
                    <th className="pb-2 text-right">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {topOvertime.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-[#9ca3af]">
                        No data
                      </td>
                    </tr>
                  ) : (
                    topOvertime.map((row) => (
                      <tr key={`${row.name}-${row.branch_name}`} className="border-t border-[#1f2937]/60">
                        <td className="py-2 text-white">{row.name}</td>
                        <td className="py-2 text-[#9ca3af]" title={row.branch_name}>
                          {branchShortLabel(row.branch_name)}
                        </td>
                        <td className="py-2 text-right font-medium text-white">{row.hours}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-3">
              <h2 className="mb-3 text-sm font-semibold text-white">Top absences (staff)</h2>
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-[#6b7280]">
                  <tr>
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Branch</th>
                    <th className="pb-2 text-right">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {topAbsences.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-[#9ca3af]">
                        No data
                      </td>
                    </tr>
                  ) : (
                    topAbsences.map((row) => (
                      <tr key={`${row.name}-${row.branch_name}`} className="border-t border-[#1f2937]/60">
                        <td className="py-2 text-white">{row.name}</td>
                        <td className="py-2 text-[#9ca3af]" title={row.branch_name}>
                          {branchShortLabel(row.branch_name)}
                        </td>
                        <td className="py-2 text-right font-medium text-white">{row.count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
