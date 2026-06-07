"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SkeletonStat } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import type { DashboardStats } from "@/lib/gm-hr/dashboard-stats";

function healthScoreCell(score: number, grade: string) {
  const textColor =
    grade === "A" || grade === "B" ? "text-emerald-400" : grade === "C" ? "text-amber-400" : "text-red-400";
  const dotColor =
    grade === "A" || grade === "B" ? "bg-emerald-400" : grade === "C" ? "bg-amber-400" : "bg-red-400";
  const tooltip =
    "Branch Health Score (0–100): combines on-time submissions, revenue trend, occupancy, and feedback. Higher is better.";

  return (
    <span title={tooltip} className="inline-flex cursor-help items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-full ${dotColor}`} aria-hidden />
      <span className={`font-bold ${textColor}`}>
        {score} {grade}
      </span>
    </span>
  );
}

export function OperationsDashboard({ mode }: { mode: "gm" | "hr" }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const url = mode === "hr" ? "/api/dashboard/stats?scope=hr" : "/api/dashboard/stats";
    fetch(url)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Failed to load");
        return r.json();
      })
      .then((j: { stats: DashboardStats }) => setStats(j.stats))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = new Intl.DateTimeFormat("en-GB", { dateStyle: "full" }).format(new Date());
  const base = mode === "gm" ? "/dashboard" : "/hr";
  const title = mode === "gm" ? "Operations Dashboard" : "HR Dashboard";
  const showGmExtras = mode === "gm";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-sm text-gray-400">{today}</p>
        </div>
      </header>

      {error ? <ErrorState message={error} onRetry={load} /> : null}

      {loading && !stats ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonStat key={i} />
          ))}
        </div>
      ) : null}

      {stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label={mode === "hr" ? "Open HR requests" : "Open report requests"} value={stats.open_requests} color="blue" />
            <StatCard label="Overdue reports" value={stats.overdue_reports} color="red" />
            <StatCard label="Pending review" value={stats.pending_review} color="yellow" />
            <StatCard label="Submitted this week" value={stats.submitted_this_week} color="green" />
          </div>

          {showGmExtras ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Revenue this week" value={`€${stats.revenue_week.toLocaleString()}`} color="purple" />
              <StatCard label="Avg occupancy" value={stats.avg_occupancy != null ? `${stats.avg_occupancy}%` : "—"} color="blue" />
              <StatCard label="Negative feedback" value={stats.negative_feedback_week} color="red" />
              <StatCard label="Unread messages" value={stats.unread_messages} color="blue" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <StatCard label="Negative feedback (week)" value={stats.negative_feedback_week} color="red" />
              <StatCard label="Unread messages" value={stats.unread_messages} color="blue" />
            </div>
          )}

          <Card title="Priority alerts">
            {stats.overdue_branches.length === 0 && stats.low_occupancy_branches.length === 0 ? (
              <p className="text-sm text-emerald-300">No urgent issues. Good operations.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {stats.overdue_branches.map((b) => (
                  <li key={b.request_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-800 bg-[#0a0f1e]/60 px-3 py-2">
                    <span className="text-gray-200">
                      <strong>{b.branch_name}</strong> — {b.days_overdue} day(s) overdue
                    </span>
                    <Button type="button" variant="outline" size="sm">
                      Send reminder
                    </Button>
                  </li>
                ))}
                {stats.low_occupancy_branches.map((b) => (
                  <li key={b.branch_id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-amber-100">
                    {b.branch_name}: occupancy {b.occupancy_rate}%
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Active report requests</h2>
            {stats.active_requests.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-10" aria-hidden />}
                title="No active requests"
                description="Report requests will appear here once sent."
              />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell as="th">Template</TableCell>
                    <TableCell as="th">Branch</TableCell>
                    <TableCell as="th">Period</TableCell>
                    <TableCell as="th">Due</TableCell>
                    <TableCell as="th">Status</TableCell>
                    <TableCell as="th">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stats.active_requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.template_title}</TableCell>
                      <TableCell>{r.branch_name}</TableCell>
                      <TableCell>
                        {r.period_start} → {r.period_end}
                      </TableCell>
                      <TableCell>{r.due_date}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell>
                        <Link href={`${base}/reports`} className="text-sm font-medium text-indigo-300 hover:underline">
                          View submissions
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          {showGmExtras ? (
            <section>
              <h2 className="mb-3 text-lg font-semibold text-white">Branch snapshot</h2>
              {stats.branch_snapshots.length === 0 ? (
                <EmptyState title="No branch data" description="KPI snapshots will appear after reports are submitted." />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell as="th">Branch</TableCell>
                      <TableCell as="th">Last report</TableCell>
                      <TableCell as="th">Occupancy</TableCell>
                      <TableCell as="th">Revenue</TableCell>
                      <TableCell as="th">Health</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.branch_snapshots.map((b) => (
                      <TableRow key={b.branch_id}>
                        <TableCell>
                          <Link href={`${base}/branches/${b.branch_id}`} className="font-medium text-indigo-300 hover:underline">
                            {b.branch_name}
                          </Link>
                        </TableCell>
                        <TableCell>{b.last_report_at ? new Date(b.last_report_at).toLocaleDateString() : "—"}</TableCell>
                        <TableCell>{b.occupancy_rate != null ? `${b.occupancy_rate}%` : "—"}</TableCell>
                        <TableCell>{b.revenue != null ? `€${b.revenue}` : "—"}</TableCell>
                        <TableCell>{healthScoreCell(b.health_score, b.health_grade)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          ) : null}

          <section className="flex flex-wrap gap-3">
            <Link href={`${base}/reports?view=send`}>
              <Button type="button">New report request</Button>
            </Link>
            <Link href={`${base}/analytics`}>
              <Button type="button" variant="secondary">
                Open analytics
              </Button>
            </Link>
            {showGmExtras ? (
              <Link href={`${base}/ki-chat`}>
                <Button type="button" variant="outline">
                  Open KI-Chat
                </Button>
              </Link>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
