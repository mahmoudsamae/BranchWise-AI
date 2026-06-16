"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { OpsDailyTable } from "@/components/branch-ops/ops-daily-table";
import { OpsDateNav } from "@/components/branch-ops/ops-date-nav";
import { OpsLogTable } from "@/components/branch-ops/ops-log-table";
import type { OpsDailyTaskItem } from "@/components/branch-ops/ops-daily-task-list";
import { Button } from "@/components/ui/Button";
import type { OpsColumn } from "@/lib/branch-ops/columns";
import { formatWorkDate, isTodayWorkDate, todayWorkDate } from "@/lib/branch-ops/dates";

type StaffOption = { id: string; full_name: string };

type OpsTable = {
  id: string;
  name: string;
  table_type: "log" | "daily";
  columns: OpsColumn[];
  rows?: { id: string; data: Record<string, unknown>; staff_name: string | null; created_at: string }[];
  items?: OpsDailyTaskItem[];
};

export function PublicOpsHub({ token }: { token: string }) {
  const [selectedDate, setSelectedDate] = useState(todayWorkDate);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [tables, setTables] = useState<OpsTable[]>([]);
  const [activeTab, setActiveTab] = useState(0);

  const readOnly = !isTodayWorkDate(selectedDate);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/${token}?date=${selectedDate}`);
      const json = (await res.json()) as {
        branch_name?: string;
        work_date?: string;
        staff?: StaffOption[];
        tables?: OpsTable[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Unavailable");
      setBranchName(json.branch_name ?? "");
      setStaff(json.staff ?? []);
      setTables(json.tables ?? []);
      setActiveTab((prev) => (prev >= (json.tables?.length ?? 0) ? 0 : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unavailable");
    } finally {
      setLoading(false);
    }
  }, [token, selectedDate]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && tables.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-[#9ca3af]">
        <Loader2 className="size-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (error && tables.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-500/30 p-8 text-center">
        <h2 className="text-lg font-semibold text-white">Ops hub unavailable</h2>
        <p className="mt-2 text-sm text-[#9ca3af]">{error}</p>
      </div>
    );
  }

  const active = tables[activeTab];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[#6366f1]">Branch Ops</p>
            <h1 className="text-xl font-bold text-white">{branchName}</h1>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <OpsDateNav date={selectedDate} onChange={setSelectedDate} />
        {readOnly ? (
          <p className="text-xs text-amber-400/90">Viewing past day — who completed each task is shown below. Switch to Today to mark new tasks.</p>
        ) : null}
      </header>

      {tables.length === 0 ? (
        <p className="rounded-xl border border-[#1f2937] p-8 text-center text-[#9ca3af]">
          No tables yet. Your branch manager can add operational tables from Branch Ops settings.
        </p>
      ) : (
        <>
          <div className="flex gap-1 overflow-x-auto border-b border-[#1f2937] pb-0">
            {tables.map((t, i) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(i)}
                className={`shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition ${
                  i === activeTab
                    ? "border border-b-0 border-[#6366f1]/50 bg-[#111827] text-white"
                    : "text-[#9ca3af] hover:text-white"
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="rounded-b-xl rounded-tr-xl border border-[#1f2937] bg-[#111827] p-4 sm:p-6">
            {active ? (
              <>
                <div className="mb-5 border-b border-[#1f2937] pb-4">
                  <p className="text-xs text-[#6b7280]">Branch Ops › {active.name}</p>
                  <h2 className="mt-1 text-xl font-bold text-white">{active.name}</h2>
                  <p className="mt-1 text-sm text-[#9ca3af]">
                    Tägliche Aufgaben · {formatWorkDate(selectedDate)}
                  </p>
                </div>
                {active.table_type === "daily" ? (
                <OpsDailyTable
                  tableId={active.id}
                  token={token}
                  workDate={selectedDate}
                  readOnly={readOnly}
                  items={active.items ?? []}
                  staff={staff}
                  onRefresh={() => void load()}
                />
                ) : (
                  <OpsLogTable
                    tableId={active.id}
                    token={token}
                    workDate={selectedDate}
                    readOnly={readOnly}
                    columns={(active.columns ?? []) as OpsColumn[]}
                    rows={active.rows ?? []}
                    staff={staff}
                    onRefresh={() => void load()}
                  />
                )}
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
