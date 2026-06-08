"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { TemplateFieldRenderer } from "@/components/reports/template-field-renderer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import type { TemplateField } from "@/lib/report-builder/template-fields";
import { reportStatusClass, reportStatusLabel } from "@/lib/reports/status-display";
import { compactPeriodLabel } from "@/lib/staff/period";
import { isAppRole, type AppRole } from "@/types/user";

type CommentRow = {
  id: string;
  message: string;
  created_at: string;
  user: { full_name: string | null; email: string; role: AppRole } | null;
};

function requesterRoleLabel(role: AppRole): string {
  if (role === "general_manager") return "General Manager";
  if (role === "hr") return "HR";
  return role.replace("_", " ");
}

type DetailPayload = {
  report: {
    id: string;
    status: string;
    data: Record<string, unknown>;
    submitted_at: string | null;
    updated_at: string;
  };
  branch: { name: string; location: string | null } | null;
  template: { title: string; type: string; fields: { id: string; label: string; type: string }[] } | null;
  request: { period_start: string; period_end: string; title: string } | null;
  requested_by: { full_name: string | null; role: AppRole } | null;
  submitter: { full_name: string | null; email: string } | null;
  comments: CommentRow[];
  ai_summary: { summary: string; generated_at: string } | null;
};

type PreviousReport = {
  period_start: string;
  period_end: string;
  data: Record<string, unknown>;
  status: string;
};

function toTemplateField(f: { id: string; label: string; type: string }): TemplateField {
  return {
    id: f.id,
    label: f.label,
    type: f.type as TemplateField["type"],
    placeholder: "",
    required: false,
  };
}

function isSignificantNumericChange(current: unknown, previous: unknown): boolean {
  if (current === undefined || current === null || current === "") return false;
  if (previous === undefined || previous === null || previous === "") return false;
  const c = typeof current === "number" ? current : Number(current);
  const p = typeof previous === "number" ? previous : Number(previous);
  if (Number.isNaN(c) || Number.isNaN(p) || p === 0) return false;
  return Math.abs((c - p) / p) > 0.1;
}

function safeDisplayValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "number") {
    if (!isFinite(val) || Math.abs(val) > 1_000_000_000) return "⚠ Ungültige Zahl";
    return String(val);
  }
  if (typeof val === "string") {
    const n = Number(val);
    if (!isNaN(n) && val.toLowerCase().includes("e") && Math.abs(n) > 1_000_000_000) {
      return "⚠ Ungültige Zahl";
    }
  }
  return String(val);
}

export function ReportDetail({ reportId, basePath }: { reportId: string; basePath: "/dashboard" | "/hr" }) {
  const { showToast } = useToast();
  const [data, setData] = useState<DetailPayload | null>(null);
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [revisionComment, setRevisionComment] = useState("");
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [previousReport, setPreviousReport] = useState<PreviousReport | null | undefined>(undefined);

  const load = useCallback(async () => {
    const res = await fetch(`/api/reports/${reportId}`);
    if (!res.ok) return;
    const j = (await res.json()) as DetailPayload;
    setData(j);
    setSummary(j.ai_summary?.summary ?? null);
  }, [reportId]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 8000);
    return () => window.clearInterval(t);
  }, [load]);

  const loadCompare = useCallback(async () => {
    setCompareLoading(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/compare`);
      if (!res.ok) {
        setPreviousReport(null);
        return;
      }
      const j = (await res.json()) as { previous: PreviousReport | null };
      setPreviousReport(j.previous);
    } catch {
      setPreviousReport(null);
    } finally {
      setCompareLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    setPreviousReport(undefined);
    if (data) void loadCompare();
  }, [reportId, data?.report.id, loadCompare]);

  const markReviewed = async () => {
    const res = await fetch(`/api/reports/${reportId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "reviewed" }),
    });
    if (!res.ok) {
      showToast("Could not update status", "error");
      return;
    }
    showToast("Marked as reviewed", "success");
    void load();
  };

  const requestRevision = async () => {
    const comment = revisionComment.trim();
    if (!comment) {
      showToast("Please enter a revision comment", "error");
      return;
    }
    setRequestingRevision(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "revision_required", comment }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        showToast(j.error ?? "Could not request revision", "error");
        return;
      }
      showToast("Revision requested", "success");
      setRevisionOpen(false);
      setRevisionComment("");
      void load();
    } finally {
      setRequestingRevision(false);
    }
  };

  const sendComment = async () => {
    const text = message.trim();
    if (!text) return;
    const res = await fetch(`/api/reports/${reportId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    if (!res.ok) {
      showToast("Could not send comment", "error");
      return;
    }
    setMessage("");
    void load();
  };

  const generateAi = async () => {
    if (loadingAi) return;
    setLoadingAi(true);
    try {
      const res = await fetch(`/api/reports/${reportId}/ai-summary`, { method: "POST" });
      const j = (await res.json()) as { summary?: string; error?: string };
      if (!res.ok) {
        showToast(j.error ?? "AI summary failed", "error");
        return;
      }
      setSummary(j.summary ?? null);
      showToast("AI summary generated", "success");
    } finally {
      setLoadingAi(false);
    }
  };

  if (!data) return <p className="text-[#9ca3af]">Loading report…</p>;

  const fields = Array.isArray(data.template?.fields) ? data.template.fields : [];
  const repData = data.report.data ?? {};
  const prevData = previousReport?.data ?? {};
  const currentPeriodLabel = data.request ? compactPeriodLabel(data.request.period_start) : "Current";
  const previousPeriodLabel = previousReport ? compactPeriodLabel(previousReport.period_start) : null;

  return (
    <div className="space-y-8">
      <Link href={`${basePath}/reports`} className="text-sm text-[#a5b4fc] hover:underline">
        ← Back to reports
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{data.branch?.name ?? "Report"}</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {data.template?.title} · {data.template?.type}
            {data.request ? ` · ${data.request.period_start} → ${data.request.period_end}` : null}
          </p>
          {data.requested_by ? (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#9ca3af]">
              <span>Requested by:</span>
              <span className="font-medium text-[#e5e7eb]">{data.requested_by.full_name ?? "Unknown"}</span>
              {isAppRole(data.requested_by.role) ? (
                <Badge tone={data.requested_by.role}>{requesterRoleLabel(data.requested_by.role)}</Badge>
              ) : null}
            </p>
          ) : null}
          {data.submitter ? (
            <p className="mt-1 text-xs text-[#6b7280]">
              Submitted by {data.submitter.full_name || data.submitter.email}
              {data.report.submitted_at ? ` · ${new Date(data.report.submitted_at).toLocaleString()}` : null}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={compareOpen ? "primary" : "outline"}
              disabled={compareLoading && previousReport === undefined}
              onClick={() => setCompareOpen((v) => !v)}
            >
              Compare with previous period ↕
            </Button>
            <span
              className={`rounded-full border border-[#1f2937] px-3 py-1 text-xs font-semibold uppercase ${reportStatusClass(data.report.status)}`}
            >
              {reportStatusLabel(data.report.status)}
            </span>
            {data.report.status === "submitted" ? (
              <>
                <Button type="button" variant="secondary" onClick={() => setRevisionOpen((v) => !v)}>
                  Request revision
                </Button>
                <Button type="button" onClick={() => void markReviewed()}>
                  Mark as reviewed
                </Button>
              </>
            ) : null}
          </div>
          {revisionOpen && data.report.status === "submitted" ? (
            <div className="w-full max-w-md rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <label className="block text-sm font-medium text-amber-100">Revision comment for branch manager</label>
              <textarea
                value={revisionComment}
                onChange={(e) => setRevisionComment(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Describe what needs to be corrected…"
                className="mt-2 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              />
              <div className="mt-3 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setRevisionOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" disabled={requestingRevision} onClick={() => void requestRevision()}>
                  {requestingRevision ? "Sending…" : "Send revision request"}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Report data</h2>

        {compareOpen ? (
          <div className="space-y-4">
            {compareLoading && previousReport === undefined ? (
              <p className="text-sm text-[#9ca3af]">Loading previous period…</p>
            ) : !previousReport ? (
              <p className="rounded-lg border border-[#1f2937] bg-[#0a0f1e]/40 px-4 py-3 text-sm text-[#9ca3af]">
                No previous period report found
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-[#a5b4fc]">
                  {currentPeriodLabel}
                  {previousPeriodLabel ? ` vs ${previousPeriodLabel}` : null}
                </p>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Current period</h3>
                    {fields.map((f) => {
                      const field = toTemplateField(f);
                      const currentVal = repData[f.id];
                      const prevVal = prevData[f.id];
                      const highlight = f.type === "number" && isSignificantNumericChange(currentVal, prevVal);
                      return (
                        <div
                          key={f.id}
                          className={cn(
                            "rounded-lg border border-[#1f2937] bg-[#0a0f1e]/60 p-4",
                            highlight && "border-amber-500/40 bg-amber-500/10",
                          )}
                        >
                          <TemplateFieldRenderer field={field} value={currentVal} readOnly />
                        </div>
                      );
                    })}
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Previous period</h3>
                    {fields.map((f) => {
                      const field = toTemplateField(f);
                      const hasPrevious = f.id in prevData;
                      const prevVal = hasPrevious ? prevData[f.id] : undefined;
                      return (
                        <div key={f.id} className="rounded-lg border border-[#1f2937] bg-[#0a0f1e]/60 p-4">
                          {hasPrevious ? (
                            <TemplateFieldRenderer field={field} value={prevVal} readOnly />
                          ) : (
                            <div className="grid gap-1.5">
                              <span className="text-sm font-medium text-[#9ca3af]">{f.label}</span>
                              <p className="text-lg font-medium text-[#6b7280]">—</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.id} className="rounded-lg border border-[#1f2937] bg-[#0a0f1e]/60 p-4">
                <p className="text-xs font-medium uppercase text-[#6b7280]">{f.label}</p>
                <p className="mt-2 text-lg font-medium text-white">{safeDisplayValue(repData[f.id])}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section
        role={summary ? undefined : "button"}
        tabIndex={summary ? undefined : 0}
        aria-busy={loadingAi}
        aria-label={summary ? undefined : loadingAi ? "Generating AI summary" : "Generate AI summary"}
        onClick={summary ? undefined : () => void generateAi()}
        onKeyDown={
          summary
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void generateAi();
                }
              }
        }
        className={cn(
          "rounded-xl border border-[#6366f1]/30 bg-[#6366f1]/5 p-6 outline-none transition",
          loadingAi && "pointer-events-none opacity-80",
          !summary &&
            !loadingAi &&
            "cursor-pointer hover:border-[#6366f1]/50 hover:bg-[#6366f1]/10 focus-visible:ring-2 focus-visible:ring-[#6366f1]/40",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">AI summary</h2>
          {!summary ? (
            <span className="inline-flex items-center gap-2 rounded-lg bg-[#6366f1] px-4 py-2 text-sm font-semibold text-white">
              <Sparkles className="size-4" aria-hidden />
              {loadingAi ? "Generating…" : "Generate AI summary"}
            </span>
          ) : null}
        </div>
        {summary ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[#e5e7eb]">{summary}</p>
        ) : (
          <p className="mt-3 text-sm text-[#9ca3af]">Tap to generate an AI summary for this report.</p>
        )}
      </section>

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Discussion</h2>
        <ul className="mb-4 max-h-80 space-y-3 overflow-y-auto">
          {data.comments.map((c) => {
            const isStaff = c.user?.role === "general_manager" || c.user?.role === "hr";
            const name = c.user?.full_name || c.user?.email || "User";
            const initials = name.slice(0, 2).toUpperCase();
            return (
              <li
                key={c.id}
                className={`flex gap-3 ${isStaff ? "flex-row-reverse text-right" : ""}`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1f2937] text-xs font-bold text-[#a5b4fc]">
                  {initials}
                </span>
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                    isStaff ? "bg-[#6366f1]/25 text-[#e5e7eb]" : "bg-[#0a0f1e] text-[#d1d5db]"
                  }`}
                >
                  <p className="flex flex-wrap items-center gap-2 text-xs text-[#9ca3af]">
                    <span className="font-semibold text-[#f9fafb]">{name}</span>
                    {c.user?.role ? <Badge tone={c.user.role}>{c.user.role.replace("_", " ")}</Badge> : null}
                    <span>{new Date(c.created_at).toLocaleString()}</span>
                  </p>
                  <p className="mt-1">{c.message}</p>
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write a comment…"
            className="min-w-0 flex-1 rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendComment();
              }
            }}
          />
          <Button type="button" onClick={() => void sendComment()}>
            Send
          </Button>
        </div>
      </section>
    </div>
  );
}
