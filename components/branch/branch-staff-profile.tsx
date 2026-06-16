"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/Button";
import { StaffReportList } from "@/components/staff/staff-report-list";
import { StaffDiscussionAlerts } from "@/components/notifications/staff-discussion-alerts";
import { formatStaffHours } from "@/lib/staff/format-hours";
import { currentCalendarWeek, formatPeriodLabel } from "@/lib/staff/period";

type StaffMember = {
  id: string;
  full_name: string;
  branch_id: string;
  branch_name: string;
  position: string;
  employment_type: string | null;
  start_date: string | null;
  is_active: boolean;
};

type ProfileTotals = {
  hours: number;
  overtime: number;
  month_overtime: number;
  absences: number;
  late: number;
  month_label: string;
};

type HistoryEntry = {
  id: string;
  week_start: string;
  period_end?: string | null;
  hours_worked: number;
  overtime_hours: number;
  absences: number;
  late_arrivals: number;
  notes: string | null;
  summary: string | null;
  report_id: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  minijob: "Minijob",
};

export function BranchStaffProfile({ staffId }: { staffId: string }) {
  const searchParams = useSearchParams();
  const highlightEntryId = searchParams.get("entry");

  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [profileTotals, setProfileTotals] = useState<ProfileTotals | null>(null);
  const [discussionUnread, setDiscussionUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    period_start: "",
    period_end: "",
    hours_worked: "",
    overtime_hours: "",
    absences: "",
    late_arrivals: "",
    summary: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/branch/staff/${staffId}/history`);
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Failed to load profile");
        return;
      }
      const j = (await res.json()) as {
        staff?: StaffMember;
        entries?: HistoryEntry[];
        discussion_unread?: Record<string, number>;
        totals?: ProfileTotals;
      };
      setStaff(j.staff ?? null);
      setEntries(j.entries ?? []);
      setProfileTotals(j.totals ?? null);
      setDiscussionUnread(j.discussion_unread ?? {});
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(
    () =>
      [...entries]
        .reverse()
        .slice(-12)
        .map((e) => ({
          week: formatPeriodLabel(e.week_start, e.period_end),
          overtime: e.overtime_hours,
          hours: e.hours_worked,
          absences: e.absences,
        })),
    [entries],
  );

  async function submitReport() {
    setSaving(true);
    try {
      const res = await fetch(`/api/branch/staff/${staffId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_start: form.period_start,
          period_end: form.period_end,
          hours_worked: Number(form.hours_worked || 0),
          overtime_hours: Number(form.overtime_hours || 0),
          absences: Number(form.absences || 0),
          late_arrivals: Number(form.late_arrivals || 0),
          summary: form.summary,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        alert(j.error ?? "Failed to save report");
        return;
      }
      setForm({
        period_start: "",
        period_end: "",
        hours_worked: "",
        overtime_hours: "",
        absences: "",
        late_arrivals: "",
        summary: "",
        notes: "",
      });
      void load();
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-[#9ca3af]">
        <Loader2 className="size-4 animate-spin" /> Loading profile…
      </p>
    );
  }

  if (error || !staff) {
    return (
      <div className="space-y-4">
        <Link href="/branch/staff" className="inline-flex items-center gap-2 text-sm text-[#a5b4fc] hover:underline">
          <ArrowLeft className="size-4" /> Back to staff
        </Link>
        <p className="text-red-300">{error ?? "Staff member not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <Link href="/branch/staff" className="inline-flex items-center gap-2 text-sm text-[#a5b4fc] hover:underline">
        <ArrowLeft className="size-4" /> My Staff
      </Link>

      <header>
        <h1 className="text-3xl font-bold text-white">{staff.full_name}</h1>
        <p className="mt-1 text-sm text-[#9ca3af]">
          {staff.position} · {staff.branch_name} · {TYPE_LABELS[staff.employment_type ?? ""] ?? "—"}
          {staff.start_date ? ` · since ${staff.start_date}` : ""}
          {!staff.is_active ? " · Inactive" : ""}
        </p>
      </header>

      <StaffDiscussionAlerts profileBasePath="/branch/staff" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
          <p className="text-xs uppercase text-[#6b7280]">Total hours</p>
          <p className="mt-1 text-2xl font-bold text-white">{formatStaffHours(profileTotals?.hours ?? 0)}</p>
          <p className="mt-1 text-xs text-[#6b7280]">All reports</p>
        </article>
        <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
          <p className="text-xs uppercase text-[#6b7280]">Overtime</p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {formatStaffHours(profileTotals?.month_overtime ?? 0)}h
          </p>
          <p className="mt-1 text-xs text-[#6b7280]">
            {profileTotals?.month_label ?? "This month"} · {formatStaffHours(profileTotals?.overtime ?? 0)}h total
          </p>
        </article>
        <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
          <p className="text-xs uppercase text-[#6b7280]">Absences</p>
          <p className="mt-1 text-2xl font-bold text-white">{profileTotals?.absences ?? 0}</p>
        </article>
        <article className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
          <p className="text-xs uppercase text-[#6b7280]">Late arrivals</p>
          <p className="mt-1 text-2xl font-bold text-white">{profileTotals?.late ?? 0}</p>
        </article>
      </section>

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-5">
        <h2 className="text-lg font-semibold text-white">Write employee report</h2>
        <p className="mt-1 text-sm text-[#9ca3af]">
          Choose the exact period this report covers (from → to). Hours and summary apply to that range only. HR can
          view but not edit.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const w = currentCalendarWeek();
              setForm((f) => ({ ...f, period_start: w.period_start, period_end: w.period_end }));
            }}
          >
            This week (Mon–Sun)
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-[#9ca3af]">
            Period from
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              value={form.period_start}
              onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
            />
          </label>
          <label className="text-sm text-[#9ca3af]">
            Period to
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              value={form.period_end}
              onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))}
            />
          </label>
          {form.period_start && form.period_end ? (
            <p className="text-xs text-[#6b7280] md:col-span-2">
              Reporting for: {formatPeriodLabel(form.period_start, form.period_end)}
            </p>
          ) : null}
          <label className="text-sm text-[#9ca3af]">
            Hours worked
            <input
              type="number"
              min={0}
              step={0.5}
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              value={form.hours_worked}
              onChange={(e) => setForm((f) => ({ ...f, hours_worked: e.target.value }))}
            />
          </label>
          <label className="text-sm text-[#9ca3af]">
            Overtime hours
            <input
              type="number"
              min={0}
              step={0.5}
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              value={form.overtime_hours}
              onChange={(e) => setForm((f) => ({ ...f, overtime_hours: e.target.value }))}
            />
          </label>
          <label className="text-sm text-[#9ca3af]">
            Absences
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              value={form.absences}
              onChange={(e) => setForm((f) => ({ ...f, absences: e.target.value }))}
            />
          </label>
          <label className="text-sm text-[#9ca3af]">
            Late arrivals
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              value={form.late_arrivals}
              onChange={(e) => setForm((f) => ({ ...f, late_arrivals: e.target.value }))}
            />
          </label>
          <label className="text-sm text-[#9ca3af] md:col-span-2">
            Performance summary (required)
            <textarea
              rows={4}
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              placeholder="What did they do in this period? Tasks, achievements, issues…"
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            />
          </label>
          <label className="text-sm text-[#9ca3af] md:col-span-2">
            Additional notes
            <textarea
              rows={2}
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
        </div>
        <div className="mt-4">
          <Button type="button" disabled={saving} onClick={() => void submitReport()}>
            {saving ? "Saving…" : "Save report"}
          </Button>
        </div>
      </section>

      {chartData.length > 0 ? (
        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
            <h2 className="mb-4 text-lg font-semibold text-white">Overtime trend</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937" }} />
                  <Line type="monotone" dataKey="overtime" stroke="#ef4444" strokeWidth={2} name="Overtime (h)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
            <h2 className="mb-4 text-lg font-semibold text-white">Hours worked</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "#111827", border: "1px solid #1f2937" }} />
                  <Bar dataKey="hours" fill="#6366f1" name="Hours" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-[#1f2937] bg-[#111827]">
        <h2 className="border-b border-[#1f2937] px-4 py-3 text-lg font-semibold text-white">Report history</h2>
        <StaffReportList
          entries={entries}
          staffMemberId={staffId}
          viewerRole="branch"
          discussionUnreadByEntry={discussionUnread}
          highlightEntryId={highlightEntryId}
        />
      </section>
    </div>
  );
}
