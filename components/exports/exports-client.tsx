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
import { useToast } from "@/components/ui/Toast";
import { lastFourWeeksRange, lastWeekRange } from "@/lib/exports/fetch-data";

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

  useEffect(() => {
    void fetch("/api/branches")
      .then((r) => r.json())
      .then((j: { branches?: { id: string; name: string }[] }) => {
        const list = j.branches ?? [];
        setBranches(list);
        setSelectedBranches(new Set(list.map((b) => b.id)));
      });
    void loadHistory();
  }, [loadHistory]);

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

  return (
    <div className="space-y-10 pb-10">
      <header>
        <h1 className="text-3xl font-bold text-white">Exporte</h1>
        <p className="mt-2 text-sm text-[#9ca3af]">KI-gestützte Managementberichte und Datenexporte</p>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Schnellexporte</h2>
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
        <h2 className="text-lg font-semibold text-white">Individueller Export</h2>
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
