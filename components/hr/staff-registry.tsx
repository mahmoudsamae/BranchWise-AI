"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Plus, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { BranchBadge } from "@/components/staff/branch-badge";
import { cn } from "@/lib/cn";
import { formatPeriodLabel, lastNDaysPeriod } from "@/lib/staff/period";

const DEFAULT_PERIOD = lastNDaysPeriod(28);

type StaffMetrics = {
  total_hours: number;
  total_overtime: number;
  total_absences: number;
  total_late: number;
  report_count: number;
  last_period_start: string | null;
  last_period_end: string | null;
};

type StaffRow = {
  id: string;
  full_name: string;
  branch_id: string;
  branch_name: string;
  branch_code: string;
  branch_letter: string;
  position: string;
  employment_type: string | null;
  start_date: string | null;
  is_active: boolean;
  metrics: StaffMetrics;
};

type RegistrySummary = {
  total_staff: number;
  active_staff: number;
  total_overtime: number;
  total_absences: number;
  no_reports: number;
};

type PeriodFilter = "28d" | "7d" | "all" | "custom";

const OVERTIME_WARN = 8;

function formatNum(n: number, decimals = 1) {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(decimals);
}

function formatLastPeriodShort(start: string | null, end: string | null) {
  if (!start) return "—";
  const fmt = (d: string) => {
    try {
      return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
        new Date(`${d}T00:00:00.000Z`),
      );
    } catch {
      return d;
    }
  };
  const endDate = end && end !== start ? end : null;
  if (!endDate) return fmt(start);
  return `${fmt(start)} – ${fmt(endDate)}`;
}

export function StaffRegistry() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [summary, setSummary] = useState<RegistrySummary | null>(null);
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [branchFilter, setBranchFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"overtime" | "absences" | "name">("overtime");
  const [periodPreset, setPeriodPreset] = useState<PeriodFilter>("28d");
  const [periodFrom, setPeriodFrom] = useState(DEFAULT_PERIOD.period_start);
  const [periodTo, setPeriodTo] = useState(DEFAULT_PERIOD.period_end);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    branch_id: "",
    position: "",
    employment_type: "full_time",
    start_date: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ active: "false" });
    if (branchFilter !== "all") p.set("branch_id", branchFilter);
    if (typeFilter !== "all") p.set("employment_type", typeFilter);
    if (periodPreset !== "all") {
      p.set("period_from", periodFrom);
      p.set("period_to", periodTo);
    }
    const res = await fetch(`/api/hr/staff?${p}`);
    const j = (await res.json()) as {
      staff?: StaffRow[];
      summary?: RegistrySummary;
      period?: { from: string; to: string } | null;
    };
    setStaff(j.staff ?? []);
    setSummary(j.summary ?? null);
    setLoading(false);
  }, [branchFilter, typeFilter, periodPreset, periodFrom, periodTo]);

  useEffect(() => {
    void fetch("/api/branches")
      .then((r) => r.json())
      .then((j: { branches?: { id: string; name: string }[] }) => setBranches(j.branches ?? []));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function applyPeriodPreset(preset: PeriodFilter) {
    setPeriodPreset(preset);
    if (preset === "28d") {
      const p = lastNDaysPeriod(28);
      setPeriodFrom(p.period_start);
      setPeriodTo(p.period_end);
    } else if (preset === "7d") {
      const p = lastNDaysPeriod(7);
      setPeriodFrom(p.period_start);
      setPeriodTo(p.period_end);
    }
  }

  const periodLabel =
    periodPreset === "all"
      ? "All time"
      : formatPeriodLabel(periodFrom, periodTo);

  const rows = useMemo(() => {
    const list = [...staff];
    if (sortBy === "overtime") {
      list.sort((a, b) => b.metrics.total_overtime - a.metrics.total_overtime);
    } else if (sortBy === "absences") {
      list.sort((a, b) => b.metrics.total_absences - a.metrics.total_absences);
    } else {
      list.sort((a, b) => a.full_name.localeCompare(b.full_name));
    }
    return list;
  }, [staff, sortBy]);

  async function saveStaff() {
    setSaving(true);
    try {
      const res = await fetch("/api/hr/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        alert(j.error ?? "Failed to save");
        return;
      }
      setModalOpen(false);
      setForm({ full_name: "", branch_id: "", position: "", employment_type: "full_time", start_date: "" });
      void load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Staff Registry</h1>
          <p className="mt-1 max-w-xl text-sm text-[#9ca3af]">
            HR overview across all branches — key hours & attendance at a glance. Open a profile for full history and
            reports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => void load()}>
            <RefreshCw className="size-4" />
          </Button>
          <Button type="button" onClick={() => setModalOpen(true)}>
            <Plus className="size-4" /> Add Staff Member
          </Button>
        </div>
      </header>

      {summary ? (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-[#1f2937] bg-[#111827] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[#6b7280]">Employees</p>
            <p className="mt-1 text-2xl font-bold text-white">{summary.total_staff}</p>
            <p className="text-xs text-[#9ca3af]">{summary.active_staff} active</p>
          </article>
          <article className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-amber-200/80">Total overtime</p>
            <p className="mt-1 text-2xl font-bold text-amber-100">{formatNum(summary.total_overtime)} h</p>
            <p className="text-xs text-[#9ca3af]">{periodLabel}</p>
          </article>
          <article className="rounded-xl border border-[#1f2937] bg-[#111827] px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-[#6b7280]">Total absences</p>
            <p className="mt-1 text-2xl font-bold text-white">{summary.total_absences}</p>
            <p className="text-xs text-[#9ca3af]">{periodLabel}</p>
          </article>
          <article
            className={cn(
              "rounded-xl border px-4 py-3",
              summary.no_reports > 0 ? "border-red-500/30 bg-red-500/5" : "border-[#1f2937] bg-[#111827]",
            )}
          >
            <p className="text-xs uppercase tracking-wide text-[#6b7280]">No reports yet</p>
            <p className="mt-1 text-2xl font-bold text-white">{summary.no_reports}</p>
            <p className="text-xs text-[#9ca3af]">Need branch manager input</p>
          </article>
        </section>
      ) : null}

      <div className="rounded-xl border border-[#1f2937] bg-[#0d1324] p-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#6b7280]">Filters</p>
        <div className="flex flex-wrap items-end gap-3">
        <select
          value={periodPreset}
          onChange={(e) => applyPeriodPreset(e.target.value as PeriodFilter)}
          className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white"
        >
          <option value="28d">Last 28 days</option>
          <option value="7d">Last 7 days</option>
          <option value="all">All time</option>
          <option value="custom">Custom range…</option>
        </select>
        {periodPreset === "custom" ? (
          <>
            <label className="text-sm text-[#9ca3af]">
              From
              <input
                type="date"
                className="ml-2 rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white"
                value={periodFrom}
                onChange={(e) => setPeriodFrom(e.target.value)}
              />
            </label>
            <label className="text-sm text-[#9ca3af]">
              To
              <input
                type="date"
                className="ml-2 rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white"
                value={periodTo}
                onChange={(e) => setPeriodTo(e.target.value)}
              />
            </label>
          </>
        ) : null}
        <select
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white"
        >
          <option value="all">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white"
        >
          <option value="all">All types</option>
          <option value="full_time">Full-time</option>
          <option value="part_time">Part-time</option>
          <option value="minijob">Minijob</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-white"
        >
          <option value="overtime">Sort: highest overtime</option>
          <option value="absences">Sort: most absences</option>
          <option value="name">Sort: name A–Z</option>
        </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1f2937] bg-[#111827]">
        {loading ? (
          <p className="flex items-center gap-2 p-6 text-[#9ca3af]">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-[#9ca3af]">No staff members match your filters.</p>
        ) : (
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-[#0a0f1e]/80 text-xs uppercase tracking-wide text-[#6b7280]">
              <tr className="border-b border-[#1f2937]">
                <th className="px-4 py-3.5">Employee</th>
                <th className="w-[4.5rem] px-2 py-3.5 text-center">Branch</th>
                <th className="px-4 py-3.5 text-right">Overtime</th>
                <th className="px-4 py-3.5 text-right">Hours</th>
                <th className="px-4 py-3.5 text-right">Absences</th>
                <th className="px-4 py-3.5 text-right">Late</th>
                <th className="px-4 py-3.5">Last period</th>
                <th className="w-24 px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f2937]/50">
              {rows.map((s) => {
                const m = s.metrics;
                const highOvertime = m.total_overtime >= OVERTIME_WARN;
                const noData = m.report_count === 0;

                return (
                  <tr key={s.id} className="text-[#e5e7eb] transition hover:bg-[#1f2937]/30">
                    <td className="px-4 py-3.5">
                      <Link href={`/hr/staff/${s.id}`} className="group flex items-center gap-3">
                        <BranchBadge
                          branchName={s.branch_name}
                          code={s.branch_code}
                          letter={s.branch_letter}
                          variant="stacked"
                          className="sm:hidden"
                        />
                        <span>
                          <span className="flex items-center gap-2 font-medium text-white group-hover:text-[#a5b4fc]">
                            {!s.is_active ? (
                              <span className="size-1.5 shrink-0 rounded-full bg-[#6b7280]" title="Inactive" />
                            ) : null}
                            {s.full_name}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#6b7280]">{s.position}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="hidden px-2 py-3.5 text-center sm:table-cell">
                      <BranchBadge
                        branchName={s.branch_name}
                        code={s.branch_code}
                        letter={s.branch_letter}
                        variant="stacked"
                      />
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm",
                          highOvertime
                            ? "bg-amber-500/15 font-semibold text-amber-200"
                            : m.total_overtime === 0
                              ? "text-[#6b7280]"
                              : "text-[#e5e7eb]",
                        )}
                      >
                        {formatNum(m.total_overtime)} h
                        {highOvertime ? <AlertTriangle className="size-3.5 shrink-0" aria-hidden /> : null}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-[#9ca3af]">
                      {formatNum(m.total_hours)} h
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      <span className={m.total_absences > 0 ? "font-medium text-red-300" : "text-[#6b7280]"}>
                        {m.total_absences}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums">
                      <span className={m.total_late > 0 ? "text-amber-200/90" : "text-[#6b7280]"}>{m.total_late}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {noData ? (
                        <span className="rounded-md bg-red-500/10 px-2 py-0.5 text-xs text-red-300">No data</span>
                      ) : (
                        <span className="text-xs text-[#9ca3af]">
                          {formatLastPeriodShort(m.last_period_start, m.last_period_end)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/hr/staff/${s.id}`}
                        className="inline-flex items-center rounded-md border border-[#374151] px-2.5 py-1 text-xs font-medium text-[#a5b4fc] transition hover:border-[#6366f1]/50 hover:bg-[#6366f1]/10"
                      >
                        Details →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={modalOpen}
        title="Add staff member"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void saveStaff()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <label className="text-sm text-[#9ca3af]">
            Full name
            <input
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </label>
          <label className="text-sm text-[#9ca3af]">
            Branch
            <select
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              value={form.branch_id}
              onChange={(e) => setForm((f) => ({ ...f, branch_id: e.target.value }))}
            >
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-[#9ca3af]">
            Position
            <input
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
            />
          </label>
          <label className="text-sm text-[#9ca3af]">
            Employment type
            <select
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              value={form.employment_type}
              onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value }))}
            >
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="minijob">Minijob</option>
            </select>
          </label>
          <label className="text-sm text-[#9ca3af]">
            Start date
            <input
              type="date"
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
            />
          </label>
        </div>
      </Modal>
    </div>
  );
}
