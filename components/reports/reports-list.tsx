"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { ReportListItem } from "@/lib/gm-hr/reports-query";
import { reportStatusClass, reportStatusLabel } from "@/lib/reports/status-display";

export function ReportsList({ basePath, embedded }: { basePath: "/dashboard" | "/hr"; embedded?: boolean }) {
  const { showToast } = useToast();
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [stats, setStats] = useState({ total: 0, submitted: 0, draft: 0, reviewed: 0, revision_required: 0 });
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkReviewing, setBulkReviewing] = useState(false);

  const selectableReports = useMemo(() => reports.filter((r) => r.status === "submitted"), [reports]);
  const hasSelection = selected.size > 0;
  const allSelectableSelected =
    selectableReports.length > 0 && selectableReports.every((r) => selected.has(r.id));

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (branchId) params.set("branch_id", branchId);
    const res = await fetch(`/api/reports?${params}`);
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const j = (await res.json()) as { reports: ReportListItem[]; stats: typeof stats };
    setReports(j.reports ?? []);
    if (j.stats) setStats(j.stats);
    setSelected(new Set());
    setLoading(false);
  }, [search, type, status, branchId]);

  useEffect(() => {
    void fetch("/api/branches")
      .then((r) => r.json())
      .then((j: { branches?: { id: string; name: string }[] }) => setBranches(j.branches ?? []));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectableReports.map((r) => r.id)));
  };

  const bulkReview = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;

    setBulkReviewing(true);
    try {
      const res = await fetch("/api/reports/bulk-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const j = (await res.json()) as {
        reviewed?: string[];
        skipped?: string[];
        errors?: string[];
        error?: string;
      };

      if (!res.ok) {
        showToast(j.error ?? "Bulk review failed", "error");
        return;
      }

      const reviewed = j.reviewed?.length ?? 0;
      const skipped = j.skipped?.length ?? 0;

      if (reviewed > 0) {
        showToast(
          skipped > 0
            ? `Marked ${reviewed} report${reviewed === 1 ? "" : "s"} as reviewed (${skipped} skipped)`
            : `Marked ${reviewed} report${reviewed === 1 ? "" : "s"} as reviewed`,
          skipped > 0 ? "warning" : "success",
        );
      } else {
        showToast("No reports were reviewed", "warning");
      }

      setSelected(new Set());
      void load();
    } finally {
      setBulkReviewing(false);
    }
  };

  return (
    <div className={cn("space-y-6", hasSelection && "pb-24")}>
      {!embedded ? <h1 className="text-2xl font-bold text-white">Reports</h1> : null}

      <div className="flex flex-wrap gap-3 rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <input
          placeholder="Search branch or template…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white">
          <option value="">All types</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="surprise">Surprise</option>
          <option value="hr">HR</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white">
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="reviewed">Reviewed</option>
          <option value="revision_required">Revision required</option>
        </select>
        <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white">
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <Button type="button" onClick={() => void load()}>
          Apply
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-5">
        {[
          ["Total", stats.total],
          ["Submitted", stats.submitted],
          ["Draft", stats.draft],
          ["Reviewed", stats.reviewed],
          ["Revision", stats.revision_required],
        ].map(([label, val]) => (
          <div key={String(label)} className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
            <p className="text-xs text-[#9ca3af]">{label}</p>
            <p className="mt-1 text-xl font-bold text-white">{val}</p>
          </div>
        ))}
      </div>

      {loading ? <SkeletonTable rows={6} cols={8} /> : null}

      {!loading && reports.length === 0 ? (
        <EmptyState title="No reports yet" description="Reports will appear here once branches submit them." />
      ) : null}

      {!loading && reports.length > 0 ? (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell as="th" className="w-10">
              {selectableReports.length > 0 ? (
                <input
                  type="checkbox"
                  aria-label="Select all submitted reports"
                  checked={allSelectableSelected}
                  onChange={toggleSelectAll}
                  className="accent-[#6366f1]"
                />
              ) : null}
            </TableCell>
            <TableCell as="th">Branch</TableCell>
            <TableCell as="th">Template</TableCell>
            <TableCell as="th">Type</TableCell>
            <TableCell as="th">Period</TableCell>
            <TableCell as="th">Status</TableCell>
            <TableCell as="th">Submitted</TableCell>
            <TableCell as="th">Action</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {reports.map((r) => {
            const canSelect = r.status === "submitted";
            const isSelected = selected.has(r.id);
            return (
            <TableRow key={r.id} className={cn(isSelected && "bg-[#6366f1]/10")}>
              <TableCell className="w-10">
                {canSelect ? (
                  <input
                    type="checkbox"
                    aria-label={`Select ${r.branch_name} report`}
                    checked={isSelected}
                    onChange={() => toggleSelect(r.id)}
                    className="accent-[#6366f1]"
                  />
                ) : null}
              </TableCell>
              <TableCell>{r.branch_name}</TableCell>
              <TableCell>{r.template_title}</TableCell>
              <TableCell>{r.type}</TableCell>
              <TableCell>
                {r.period_start ?? "—"} → {r.period_end ?? "—"}
              </TableCell>
              <TableCell>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${reportStatusClass(r.status)}`}>
                  {reportStatusLabel(r.status)}
                </span>
              </TableCell>
              <TableCell>{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}</TableCell>
              <TableCell>
                <Link href={`${basePath}/reports/${r.id}`} className="text-sm font-medium text-[#a5b4fc] hover:underline">
                  View details
                </Link>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
      ) : null}

      {hasSelection ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#1f2937] bg-[#0a0f1e]/95 px-4 py-4 backdrop-blur-sm">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#e5e7eb]">
              <span className="font-semibold text-white">{selected.size}</span> report{selected.size === 1 ? "" : "s"} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => setSelected(new Set())}>
                Clear selection
              </Button>
              <Button type="button" disabled={bulkReviewing} onClick={() => void bulkReview()}>
                {bulkReviewing ? "Reviewing…" : "Mark as reviewed"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
