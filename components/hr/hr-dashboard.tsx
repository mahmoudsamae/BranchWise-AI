"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Clock, Loader2, RefreshCw, Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { HrDashboardPayload } from "@/lib/hr/dashboard-service";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function KpiCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-[#6b7280]">
        {icon}
        {label}
      </div>
      <p className={cn("mt-2 text-3xl font-bold", accent ?? "text-white")}>{value}</p>
    </article>
  );
}

export function HrDashboard() {
  const [data, setData] = useState<HrDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch("/api/hr/setup-template");
      const res = await fetch("/api/hr/dashboard");
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Failed to load dashboard");
        setData(null);
        return;
      }
      setData((await res.json()) as HrDashboardPayload);
    } catch {
      setError("Request failed");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const alerts = data?.alerts;
  const hasAlerts =
    (alerts?.high_overtime.length ?? 0) > 0 ||
    (alerts?.poor_morale.length ?? 0) > 0 ||
    (alerts?.missing_report.length ?? 0) > 0;

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">HR Dashboard</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">People operations â€” staff, attendance, and morale</p>
        </div>
        <Button type="button" variant="secondary" disabled={loading} onClick={() => void load()}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </Button>
      </header>

      {error ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </div>
      ) : null}

      {loading && !data ? (
        <p className="flex items-center gap-2 text-sm text-[#9ca3af]">
          <Loader2 className="size-4 animate-spin" /> Loadingâ€¦
        </p>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Open HR requests"
              value={data.kpis.open_requests}
              icon={<Clock className="size-4" aria-hidden />}
            />
            <KpiCard
              label="Submitted this week"
              value={data.kpis.submitted_this_week}
              icon={<Users className="size-4" aria-hidden />}
              accent="text-[#a5b4fc]"
            />
            <KpiCard
              label="Overtime hours (7d)"
              value={data.kpis.overtime_hours_week}
              icon={<Clock className="size-4" aria-hidden />}
            />
            <KpiCard
              label="Staff registered"
              value={data.kpis.staff_registered}
              icon={<Users className="size-4" aria-hidden />}
              accent="text-emerald-400"
            />
          </section>

          {hasAlerts ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-white">Alerts</h2>
              <div className="grid gap-3 lg:grid-cols-3">
                {alerts!.high_overtime.length > 0 ? (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
                    <h3 className="text-sm font-semibold text-amber-200">High overtime (&gt;15h / week)</h3>
                    <ul className="mt-2 space-y-1 text-sm text-amber-100/90">
                      {alerts!.high_overtime.map((b) => (
                        <li key={b.branch_id}>
                          {b.branch_name}: <strong>{b.overtime_hours}h</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {alerts!.poor_morale.length > 0 ? (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
                    <h3 className="text-sm font-semibold text-red-200">Poor morale reported</h3>
                    <ul className="mt-2 space-y-1 text-sm text-red-100/90">
                      {alerts!.poor_morale.map((b) => (
                        <li key={b.branch_id}>{b.branch_name}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {alerts!.missing_report.length > 0 ? (
                  <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
                    <h3 className="text-sm font-semibold text-yellow-200">No HR report this week</h3>
                    <ul className="mt-2 space-y-1 text-sm text-yellow-100/90">
                      {alerts!.missing_report.map((b) => (
                        <li key={b.branch_id}>{b.branch_name}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="overflow-x-auto rounded-xl border border-[#1f2937] bg-[#111827]">
            <h2 className="border-b border-[#1f2937] px-4 py-3 text-lg font-semibold text-white">
              Active HR requests
            </h2>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs uppercase text-[#6b7280]">
                <tr className="border-b border-[#1f2937]">
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted by</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.active_requests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-[#9ca3af]">
                      No pending HR requests.
                    </td>
                  </tr>
                ) : (
                  data.active_requests.map((r) => (
                    <tr key={r.request_id} className="border-b border-[#1f2937]/60 text-[#e5e7eb]">
                      <td className="px-4 py-3 font-medium text-white">{r.branch_name}</td>
                      <td className="px-4 py-3">{r.period}</td>
                      <td className="px-4 py-3">{r.due_date}</td>
                      <td className="px-4 py-3 capitalize">{r.status}</td>
                      <td className="px-4 py-3">{r.submitted_by_name ?? "â€”"}</td>
                      <td className="px-4 py-3">
                        {r.report_id ? (
                          <Link
                            href={`/hr/reports/${r.report_id}`}
                            className="text-[#a5b4fc] hover:underline"
                          >
                            View
                          </Link>
                        ) : (
                          <span className="text-[#6b7280]">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>

          <section className="overflow-x-auto rounded-xl border border-[#1f2937] bg-[#111827]">
            <h2 className="border-b border-[#1f2937] px-4 py-3 text-lg font-semibold text-white">
              Recent HR reports
            </h2>
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="text-xs uppercase text-[#6b7280]">
                <tr className="border-b border-[#1f2937]">
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Submitted at</th>
                  <th className="px-4 py-3">Overtime (h)</th>
                  <th className="px-4 py-3">Morale</th>
                  <th className="px-4 py-3">Absences</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_reports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-[#9ca3af]">
                      No submitted HR reports yet.
                    </td>
                  </tr>
                ) : (
                  data.recent_reports.map((r) => (
                    <tr key={r.report_id} className="border-b border-[#1f2937]/60 text-[#e5e7eb]">
                      <td className="px-4 py-3 font-medium text-white">{r.branch_name}</td>
                      <td className="px-4 py-3">{r.week}</td>
                      <td className="px-4 py-3">{formatDate(r.submitted_at)}</td>
                      <td className="px-4 py-3">{r.overtime_hours}</td>
                      <td className="px-4 py-3 capitalize">{r.morale ?? "â€”"}</td>
                      <td className="px-4 py-3">{r.absences}</td>
                      <td className="px-4 py-3">
                        <Link href={`/hr/reports/${r.report_id}`} className="text-[#a5b4fc] hover:underline">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}


