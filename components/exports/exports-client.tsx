"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Calendar,
  Check,
  FileText,
  Loader2,
  Sparkles,
  Table2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { EXPORT_TYPE_LABELS } from "@/lib/exports/delivery-schedule-labels";
import { lastFourWeeksRange, lastWeekRange } from "@/lib/exports/fetch-data";
import type { ScheduledExportType } from "@/lib/exports/generate-pdf";
import { DAY_OF_WEEK_LABELS } from "@/lib/schedules/dates";

type ExportFormat = "pdf" | "excel" | "both";

type HistoryEntry = {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  branches: string;
  format: ExportFormat | "pdf" | string;
  generated_at: string;
};

type QuickCard = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  defaultBody: () => Record<string, unknown>;
  filename: (body: Record<string, unknown>) => string;
  format: "pdf" | "excel";
};

type DeliveryScheduleRow = {
  id: string;
  export_type: ScheduledExportType;
  day_of_week: number;
  hour_utc: number;
  branch_ids: string[];
  branch_names: string[];
  all_branches: boolean;
  is_active: boolean;
  last_sent_at: string | null;
  label: string;
};

function ScheduleSkeleton() {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {[0, 1].map((i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-[#1f2937]/80" />
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="mt-4 space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-[#1f2937]/80" />
      ))}
    </div>
  );
}

export function ExportsClient({ mode }: { mode: "gm" | "hr" }) {
  const { showToast } = useToast();
  const fourWeeks = useMemo(() => lastFourWeeksRange(), []);
  const week = useMemo(() => lastWeekRange(), []);

  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<Set<string>>(new Set());
  const [customStart, setCustomStart] = useState(fourWeeks.start);
  const [customEnd, setCustomEnd] = useState(fourWeeks.end);
  const [includeReports, setIncludeReports] = useState(true);
  const [includeKpis, setIncludeKpis] = useState(true);
  const [includeAi, setIncludeAi] = useState(true);
  const [includeFruhstuck, setIncludeFruhstuck] = useState(mode === "gm");
  const [includeComm, setIncludeComm] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [cardState, setCardState] = useState<Record<string, "idle" | "loading" | "ready">>({});
  const [customLoading, setCustomLoading] = useState(false);
  const [deliverySchedules, setDeliverySchedules] = useState<DeliveryScheduleRow[]>([]);
  const [schedulesLoading, setSchedulesLoading] = useState(true);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    export_type: "weekly" as ScheduledExportType,
    day_of_week: 0,
    hour_utc: 7,
    all_branches: true,
    branch_ids: new Set<string>(),
  });

  const downloadUrls = useRef<Map<string, string>>(new Map());

  const branchIds = useMemo(() => [...selectedBranches], [selectedBranches]);
  const branchLabel = branchIds.length === branches.length ? "All branches" : `${branchIds.length} branch(es)`;

  const quickCards: QuickCard[] = useMemo(
    () => [
      {
        id: "management",
        title: "Management Report",
        description: "Executive summary with AI insights, KPIs, branch comparison and recommendations.",
        icon: (
          <>
            <FileText className="size-5" aria-hidden />
            <Sparkles className="size-4 text-[#a5b4fc]" aria-hidden />
          </>
        ),
        endpoint: "/api/exports/management-pdf",
        defaultBody: () => ({ start_date: fourWeeks.start, end_date: fourWeeks.end, branch_ids: [] }),
        filename: () => `management-report-${fourWeeks.end}.pdf`,
        format: "pdf",
      },
      {
        id: "comparison",
        title: "Branch Comparison",
        description: "Side-by-side KPI analysis with AI evaluation of best and worst performers.",
        icon: <ArrowLeftRight className="size-5" aria-hidden />,
        endpoint: "/api/exports/comparison-pdf",
        defaultBody: () => ({ start_date: fourWeeks.start, end_date: fourWeeks.end, branch_ids: [] }),
        filename: () => `branch-comparison-${fourWeeks.end}.pdf`,
        format: "pdf",
      },
      {
        id: "weekly",
        title: "Weekly Package",
        description: "All report submissions for last week with AI summary per branch.",
        icon: <Calendar className="size-5" aria-hidden />,
        endpoint: "/api/exports/weekly-pdf",
        defaultBody: () => ({ week_start_date: week.start, end_date: week.end, branch_ids: [] }),
        filename: () => `weekly-package-${week.start}.pdf`,
        format: "pdf",
      },
      {
        id: "excel",
        title: "Analytics Excel",
        description: "Full KPI data, report log, feedback signals and Frühstück data in spreadsheet format.",
        icon: <Table2 className="size-5" aria-hidden />,
        endpoint: "/api/exports/analytics-excel",
        defaultBody: () => ({ start_date: fourWeeks.start, end_date: fourWeeks.end, branch_ids: [] }),
        filename: () => `analytics-export-${fourWeeks.end}.xlsx`,
        format: "excel",
      },
    ],
    [fourWeeks, week],
  );

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/exports/history");
      const j = (await res.json()) as { history?: HistoryEntry[] };
      if (res.ok) setHistory(j.history ?? []);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadDeliverySchedules = useCallback(async () => {
    setSchedulesLoading(true);
    try {
      const res = await fetch("/api/exports/delivery-schedules");
      const j = (await res.json()) as { schedules?: DeliveryScheduleRow[]; error?: string };
      if (res.ok) setDeliverySchedules(j.schedules ?? []);
    } finally {
      setSchedulesLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch("/api/branches")
      .then((r) => r.json())
      .then((j: { branches?: { id: string; name: string }[] }) => {
        const list = j.branches ?? [];
        setBranches(list);
        setSelectedBranches(new Set(list.map((b) => b.id)));
      });
    void loadHistory();
    void loadDeliverySchedules();
  }, [loadHistory, loadDeliverySchedules]);

  const pushHistory = async (entry: Omit<HistoryEntry, "id" | "generated_at">) => {
    try {
      const res = await fetch("/api/exports/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          export_type: entry.type,
          start_date: entry.start_date,
          end_date: entry.end_date,
          branches: entry.branches,
          format: entry.format,
        }),
      });
      const j = (await res.json()) as { id?: string; entry?: HistoryEntry };
      if (res.ok && j.entry) {
        setHistory((prev) => [j.entry!, ...prev].slice(0, 20));
        return j.entry.id;
      }
    } catch {
      // fall through to local id for in-session re-download only
    }

    const fallback: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      generated_at: new Date().toISOString(),
    };
    setHistory((prev) => [fallback, ...prev].slice(0, 20));
    return fallback.id;
  };

  const downloadBlob = (blob: Blob, filename: string, historyId: string) => {
    const url = URL.createObjectURL(blob);
    downloadUrls.current.set(historyId, url);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const runExport = useCallback(
    async (card: QuickCard, bodyOverride?: Record<string, unknown>) => {
      setCardState((s) => ({ ...s, [card.id]: "loading" }));
      const body: Record<string, unknown> = {
        ...card.defaultBody(),
        ...bodyOverride,
        branch_ids: branchIds.length ? branchIds : [],
      };

      try {
        const res = await fetch(card.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error ?? "Export failed");
        }
        const blob = await res.blob();
        const filename = card.filename(body);
        const hid = await pushHistory({
          type: card.title,
          start_date: String(body.start_date ?? body.week_start_date ?? customStart),
          end_date: String(body.end_date ?? customEnd),
          branches: branchLabel,
          format: card.format,
        });
        downloadBlob(blob, filename, hid);
        setCardState((s) => ({ ...s, [card.id]: "ready" }));
        setTimeout(() => setCardState((s) => ({ ...s, [card.id]: "idle" })), 10000);
      } catch {
        setCardState((s) => ({ ...s, [card.id]: "idle" }));
        alert("Export failed. Check server logs and OPENAI_API_KEY for PDF exports.");
      }
    },
    [branchIds, branchLabel, customStart, customEnd],
  );

  const runCustom = async () => {
    setCustomLoading(true);
    const body = {
      start_date: customStart,
      end_date: customEnd,
      branch_ids: branchIds,
      include: {
        reports: includeReports,
        kpis: includeKpis,
        ai_summary: includeAi,
        fruhstuck: includeFruhstuck,
        communication: includeComm,
      },
    };

    try {
      if (format === "excel" || format === "both") {
        const res = await fetch("/api/exports/analytics-excel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("Excel export failed");
        const blob = await res.blob();
        const hid = await pushHistory({
          type: "Custom Export",
          start_date: customStart,
          end_date: customEnd,
          branches: branchLabel,
          format: format === "both" ? "both" : "excel",
        });
        downloadBlob(blob, `custom-analytics-${customEnd}.xlsx`, hid);
      }
      if (format === "pdf" || format === "both") {
        const res = await fetch("/api/exports/management-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error("PDF export failed");
        const blob = await res.blob();
        const hid = await pushHistory({
          type: "Custom Management PDF",
          start_date: customStart,
          end_date: customEnd,
          branches: branchLabel,
          format: format === "both" ? "both" : "pdf",
        });
        downloadBlob(blob, `custom-management-${customEnd}.pdf`, hid);
      }
    } catch {
      alert("Custom export failed.");
    } finally {
      setCustomLoading(false);
    }
  };

  const toggleBranch = (id: string) => {
    setSelectedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleScheduleBranch = (id: string) => {
    setScheduleForm((f) => {
      const next = new Set(f.branch_ids);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...f, all_branches: false, branch_ids: next };
    });
  };

  const openScheduleModal = () => {
    setScheduleForm({
      export_type: "weekly",
      day_of_week: 0,
      hour_utc: 7,
      all_branches: true,
      branch_ids: new Set(),
    });
    setScheduleModalOpen(true);
  };

  const createDeliverySchedule = async () => {
    if (!scheduleForm.all_branches && scheduleForm.branch_ids.size === 0) {
      showToast("Select at least one branch or choose all branches", "error");
      return;
    }
    if (
      scheduleForm.export_type === "comparison" &&
      !scheduleForm.all_branches &&
      scheduleForm.branch_ids.size < 2
    ) {
      showToast("Comparison exports need at least two branches", "error");
      return;
    }

    setScheduleSaving(true);
    try {
      const res = await fetch("/api/exports/delivery-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          export_type: scheduleForm.export_type,
          day_of_week: scheduleForm.day_of_week,
          hour_utc: scheduleForm.hour_utc,
          all_branches: scheduleForm.all_branches,
          branch_ids: scheduleForm.all_branches ? [] : [...scheduleForm.branch_ids],
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(j.error ?? "Could not create schedule", "error");
        return;
      }
      showToast("Delivery schedule created", "success");
      setScheduleModalOpen(false);
      void loadDeliverySchedules();
    } finally {
      setScheduleSaving(false);
    }
  };

  const deleteDeliverySchedule = async (id: string) => {
    const res = await fetch("/api/exports/delivery-schedules", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const j = (await res.json()) as { error?: string };
    if (!res.ok) {
      showToast(j.error ?? "Could not delete schedule", "error");
      return;
    }
    showToast("Schedule removed", "success");
    void loadDeliverySchedules();
  };

  const hourOptions = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  return (
    <div className="space-y-10 pb-10">
      <header>
        <h1 className="text-3xl font-bold text-white">Exports</h1>
        <p className="mt-2 text-sm text-[#9ca3af]">AI-powered management reports and data exports</p>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Quick exports</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickCards.map((card) => {
            const state = cardState[card.id] ?? "idle";
            const isExcel = card.format === "excel";
            return (
              <article
                key={card.id}
                className="flex flex-col rounded-xl border border-[#1f2937] bg-[#111827] p-5"
              >
                <div className="flex items-center gap-2 text-[#a5b4fc]">{card.icon}</div>
                <h3 className="mt-3 font-bold text-white">{card.title}</h3>
                <p className="mt-2 flex-1 text-sm text-[#9ca3af]">{card.description}</p>
                <Button
                  type="button"
                  className="mt-4 w-full"
                  disabled={state === "loading"}
                  onClick={() => void runExport(card)}
                >
                  {state === "loading" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Generating…
                    </>
                  ) : state === "ready" ? (
                    <>
                      <Check className="size-4" aria-hidden />
                      Download
                    </>
                  ) : isExcel ? (
                    "Export Excel"
                  ) : (
                    "Generate PDF"
                  )}
                </Button>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Scheduled Delivery</h2>
            <p className="mt-1 text-sm text-[#9ca3af]">
              Automatically generate PDFs and email them to you. Times are in UTC (max 3 schedules).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={deliverySchedules.length >= 3}
            onClick={openScheduleModal}
          >
            Schedule delivery
          </Button>
        </div>

        {schedulesLoading ? (
          <ScheduleSkeleton />
        ) : deliverySchedules.length === 0 ? (
          <p className="mt-4 text-sm text-[#9ca3af]">No scheduled deliveries yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {deliverySchedules.map((s) => (
              <article
                key={s.id}
                className="flex flex-col justify-between rounded-xl border border-[#1f2937] bg-[#0a0f1e]/60 p-4"
              >
                <div>
                  <p className="font-medium text-white">{s.label}</p>
                  <p className="mt-2 text-sm text-[#9ca3af]">
                    {s.all_branches ? "All branches" : s.branch_names.join(", ") || `${s.branch_ids.length} branch(es)`}
                  </p>
                  {s.last_sent_at ? (
                    <p className="mt-1 text-xs text-[#6b7280]">
                      Last sent{" "}
                      {new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" }).format(
                        new Date(s.last_sent_at),
                      )}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[#6b7280]">Not sent yet</p>
                  )}
                </div>
                <div className="mt-4">
                  <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => void deleteDeliverySchedule(s.id)}>
                    Remove
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        open={scheduleModalOpen}
        title="Schedule delivery"
        onClose={() => setScheduleModalOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={scheduleSaving} onClick={() => void createDeliverySchedule()}>
              {scheduleSaving ? "Saving…" : "Create schedule"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 pt-2">
          <p className="text-xs text-[#9ca3af]">All times are UTC. You can have up to 3 active schedules.</p>

          <div className="grid gap-1.5">
            <span className="text-sm font-medium text-[#9ca3af]">Export type</span>
            <select
              value={scheduleForm.export_type}
              onChange={(e) =>
                setScheduleForm((f) => ({ ...f, export_type: e.target.value as ScheduledExportType }))
              }
              className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
            >
              <option value="weekly">{EXPORT_TYPE_LABELS.weekly}</option>
              <option value="management">{EXPORT_TYPE_LABELS.management}</option>
              <option value="comparison">{EXPORT_TYPE_LABELS.comparison}</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-[#9ca3af]">Day of week</span>
              <select
                value={scheduleForm.day_of_week}
                onChange={(e) => setScheduleForm((f) => ({ ...f, day_of_week: Number(e.target.value) }))}
                className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              >
                {DAY_OF_WEEK_LABELS.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <span className="text-sm font-medium text-[#9ca3af]">Hour (UTC)</span>
              <select
                value={scheduleForm.hour_utc}
                onChange={(e) => setScheduleForm((f) => ({ ...f, hour_utc: Number(e.target.value) }))}
                className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              >
                {hourOptions.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-[#e5e7eb]">
            <input
              type="checkbox"
              checked={scheduleForm.all_branches}
              onChange={(e) =>
                setScheduleForm((f) => ({
                  ...f,
                  all_branches: e.target.checked,
                  branch_ids: e.target.checked ? new Set() : f.branch_ids,
                }))
              }
              className="accent-[#6366f1]"
            />
            All branches
          </label>

          {!scheduleForm.all_branches ? (
            <ul className="grid max-h-40 gap-2 overflow-y-auto sm:grid-cols-2">
              {branches.map((b) => (
                <li key={b.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#1f2937] px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={scheduleForm.branch_ids.has(b.id)}
                      onChange={() => toggleScheduleBranch(b.id)}
                      className="accent-[#6366f1]"
                    />
                    {b.name}
                  </label>
                </li>
              ))}
            </ul>
          ) : null}

          {scheduleForm.export_type === "comparison" ? (
            <p className="text-xs text-amber-200/90">Comparison exports require at least two branches.</p>
          ) : null}
        </div>
      </Modal>

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
        <h2 className="text-lg font-semibold text-white">Custom export</h2>
        <div className="mt-6 grid gap-6">
          <div className="flex flex-wrap gap-4">
            <label className="text-sm text-[#9ca3af]">
              From
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="mt-1 block rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              />
            </label>
            <label className="text-sm text-[#9ca3af]">
              To
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="mt-1 block rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-white"
              />
            </label>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                className="text-xs"
                onClick={() => setSelectedBranches(new Set(branches.map((b) => b.id)))}
              >
                Select all
              </Button>
              <Button type="button" variant="ghost" className="text-xs" onClick={() => setSelectedBranches(new Set())}>
                Deselect all
              </Button>
            </div>
            <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-[#1f2937] p-3">
              {branches.map((b) => (
                <li key={b.id}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[#e5e7eb]">
                    <input
                      type="checkbox"
                      checked={selectedBranches.has(b.id)}
                      onChange={() => toggleBranch(b.id)}
                      className="accent-[#6366f1]"
                    />
                    {b.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2 text-sm text-[#e5e7eb]">
            <p className="font-medium text-[#9ca3af]">Include in export</p>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeReports} onChange={(e) => setIncludeReports(e.target.checked)} className="accent-[#6366f1]" />
              Reports data
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeKpis} onChange={(e) => setIncludeKpis(e.target.checked)} className="accent-[#6366f1]" />
              KPI Analytics
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeAi} onChange={(e) => setIncludeAi(e.target.checked)} className="accent-[#6366f1]" />
              AI Summary
            </label>
            {mode === "gm" ? (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={includeFruhstuck} onChange={(e) => setIncludeFruhstuck(e.target.checked)} className="accent-[#6366f1]" />
                Frühstück data
              </label>
            ) : null}
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={includeComm} onChange={(e) => setIncludeComm(e.target.checked)} className="accent-[#6366f1]" />
              Communication logs (optional)
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[#9ca3af]">Format</p>
            <div className="flex flex-wrap gap-4 text-sm text-white">
              {(["pdf", "excel", "both"] as ExportFormat[]).map((f) => (
                <label key={f} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    checked={format === f}
                    onChange={() => setFormat(f)}
                    className="accent-[#6366f1]"
                  />
                  {f === "both" ? "Both" : f.toUpperCase()}
                </label>
              ))}
            </div>
          </div>

          <Button type="button" className="w-full py-3" disabled={customLoading} onClick={() => void runCustom()}>
            {customLoading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Generating export…
              </>
            ) : (
              "Generate Export"
            )}
          </Button>
        </div>
      </section>

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
        <h2 className="text-lg font-semibold text-white">Recent exports</h2>
        <p className="mt-1 text-xs text-[#6b7280]">Saved to your account</p>
        {historyLoading ? (
          <HistorySkeleton />
        ) : history.length === 0 ? (
          <p className="mt-4 text-sm text-[#9ca3af]">No exports yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-[#6b7280]">
                <tr className="border-b border-[#1f2937]">
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Date range</th>
                  <th className="py-2 pr-4">Branches</th>
                  <th className="py-2 pr-4">Generated</th>
                  <th className="py-2 pr-4">Format</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-[#1f2937]/50 text-[#e5e7eb]">
                    <td className="py-2 pr-4">{h.type}</td>
                    <td className="py-2 pr-4">
                      {h.start_date} — {h.end_date}
                    </td>
                    <td className="py-2 pr-4">{h.branches}</td>
                    <td className="py-2 pr-4">
                      {new Intl.DateTimeFormat("en-GB", { dateStyle: "short", timeStyle: "short" }).format(
                        new Date(h.generated_at),
                      )}
                    </td>
                    <td className="py-2 pr-4 uppercase">{h.format}</td>
                    <td className="py-2">
                      {downloadUrls.current.has(h.id) ? (
                        <button
                          type="button"
                          className="text-[#a5b4fc] hover:underline"
                          onClick={() => {
                            const url = downloadUrls.current.get(h.id);
                            if (url) window.open(url, "_blank");
                          }}
                        >
                          Re-download
                        </button>
                      ) : (
                        <span className="text-[#6b7280]">Regenerate</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
