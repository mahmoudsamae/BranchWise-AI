"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { formatStaffHours } from "@/lib/staff/format-hours";

type StaffRow = {
  id: string;
  full_name: string;
  branch_name: string;
  position: string;
  employment_type: string | null;
  start_date: string | null;
  is_active: boolean;
  metrics?: {
    month_overtime: number;
    total_overtime: number;
    month_hours: number;
    report_count: number;
  };
};

const TYPE_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  minijob: "Minijob",
};

export function BranchStaffRegistry() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [monthLabel, setMonthLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ active: "false" });
    if (typeFilter !== "all") p.set("employment_type", typeFilter);
    const res = await fetch(`/api/branch/staff?${p}`);
    const j = (await res.json()) as { staff?: StaffRow[]; period?: { label?: string } };
    setStaff(j.staff ?? []);
    setMonthLabel(j.period?.label ?? "");
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-xl border border-[#374151] bg-[#111827] px-4 py-3 text-sm text-[#d1d5db]">
        Staff records are managed by HR. Contact HR to add or update staff members.
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Staff Directory</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">View branch staff and open profiles for report entries</p>
        </div>
        <Button type="button" variant="secondary" onClick={() => void load()}>
          <RefreshCw className="size-4" />
        </Button>
      </header>

      <div className="flex flex-wrap gap-3">
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
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#1f2937] bg-[#111827]">
        {loading ? (
          <p className="flex items-center gap-2 p-6 text-[#9ca3af]">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : (
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="text-xs uppercase text-[#6b7280]">
              <tr className="border-b border-[#1f2937]">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Überstunden{monthLabel ? ` (${monthLabel})` : ""}</th>
                <th className="px-4 py-3">Since</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-[#9ca3af]">
                    No staff members listed for this branch. Contact HR to register employees.
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id} className="border-b border-[#1f2937]/60 text-[#e5e7eb]">
                    <td className="px-4 py-3 font-medium text-white">{s.full_name}</td>
                    <td className="px-4 py-3">{s.position}</td>
                    <td className="px-4 py-3">{TYPE_LABELS[s.employment_type ?? ""] ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={s.metrics?.month_overtime ? "font-medium text-amber-400" : "text-[#9ca3af]"}>
                        {formatStaffHours(s.metrics?.month_overtime ?? 0)}h
                      </span>
                      {(s.metrics?.total_overtime ?? 0) > (s.metrics?.month_overtime ?? 0) ? (
                        <span className="ml-1 text-xs text-[#6b7280]">
                          ({formatStaffHours(s.metrics?.total_overtime ?? 0)}h gesamt)
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{s.start_date ?? "—"}</td>
                    <td className="px-4 py-3">{s.is_active ? "Active" : "Inactive"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/branch/staff/${s.id}`} className="text-[#a5b4fc] hover:underline">
                        Profile & reports
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
