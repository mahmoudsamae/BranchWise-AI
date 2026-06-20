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

import { Staff360Panel } from "@/components/hr/staff-360-panel";
import { StaffDiscussionAlerts } from "@/components/notifications/staff-discussion-alerts";
import { StaffProfileStats } from "@/components/staff/staff-profile-stats";
import { StaffReportList } from "@/components/staff/staff-report-list";
import { formatPeriodLabel } from "@/lib/staff/period";

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

export function StaffProfile({ staffId }: { staffId: string }) {
  const searchParams = useSearchParams();
  const highlightEntryId = searchParams.get("entry");

  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [discussionUnread, setDiscussionUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/hr/staff/${staffId}/history`);
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Failed to load profile");
        return;
      }
      const j = (await res.json()) as {
        staff?: StaffMember;
        entries?: HistoryEntry[];
        discussion_unread?: Record<string, number>;
      };
      setStaff(j.staff ?? null);
      setEntries(j.entries ?? []);
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
        <Link href="/hr/staff" className="inline-flex items-center gap-2 text-sm text-[#a5b4fc] hover:underline">
          <ArrowLeft className="size-4" /> Back to registry
        </Link>
        <p className="text-red-300">{error ?? "Staff member not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <Link href="/hr/staff" className="inline-flex items-center gap-2 text-sm text-[#a5b4fc] hover:underline">
        <ArrowLeft className="size-4" /> Staff Registry
      </Link>

      <header>
        <h1 className="text-3xl font-bold text-white">{staff.full_name}</h1>
        <p className="mt-1 text-sm text-[#9ca3af]">
          {staff.position} · {staff.branch_name} · {TYPE_LABELS[staff.employment_type ?? ""] ?? "—"}
          {staff.start_date ? ` · since ${staff.start_date}` : ""}
          {!staff.is_active ? " · Inactive" : ""}
          {" · "}
          <span className="text-[#6b7280]">Read-only view</span>
        </p>
      </header>

      <StaffDiscussionAlerts profileBasePath="/hr/staff" />

      <Staff360Panel staffId={staffId} />

      <StaffProfileStats entries={entries} />

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
        <h2 className="border-b border-[#1f2937] px-4 py-3 text-lg font-semibold text-white">
          Report history <span className="text-sm font-normal text-[#6b7280]">(read-only)</span>
        </h2>
        <StaffReportList
          entries={entries}
          staffMemberId={staffId}
          viewerRole="hr"
          discussionUnreadByEntry={discussionUnread}
          highlightEntryId={highlightEntryId}
        />
      </section>
    </div>
  );
}
