"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { StaffReportTable, type StaffEntryRow } from "@/components/branch/staff-report-table";
import { TemplateFieldRenderer } from "@/components/reports/template-field-renderer";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { TemplateField } from "@/lib/kpi-extractor";
import { reportStatusClass, reportStatusLabel } from "@/lib/reports/status-display";
import { daysUntilDue, urgencyForDueDate } from "@/lib/branch/urgency";

type DetailResponse = {
  request: {
    id: string;
    title: string;
    request_type: string;
    period_start: string;
    period_end: string;
    due_date: string;
    status: string;
    template_id: string;
  };
  template: { id: string; title: string; type: string; fields: TemplateField[] };
  report: {
    id: string;
    data: Record<string, unknown>;
    status: string;
    submitted_at: string | null;
    updated_at: string;
    revision_comment?: string | null;
  } | null;
};

function formatDay(d: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(`${d}T00:00:00.000Z`));
  } catch {
    return d;
  }
}

export function FillReportForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [reportId, setReportId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [staffRows, setStaffRows] = useState<StaffEntryRow[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isHrTemplate = detail?.template.type === "hr";

  const isRevisionRequired = detail?.report?.status === "revision_required";
  const readOnly =
    detail?.report?.status === "submitted" ||
    (detail?.request.status !== "pending" && !isRevisionRequired);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/branch/report-request/${requestId}`);
      const d = (await res.json()) as DetailResponse & { error?: string };
      if (!res.ok) {
        showToast(d.error ?? "Failed to load", "error");
        setDetail(null);
        return;
      }
      setDetail(d);
      setReportId(d.report?.id ?? null);
      setData(d.report?.data ?? {});
      if (d.report?.updated_at) setLastSavedAt(d.report.updated_at);
    } finally {
      setLoading(false);
    }
  }, [requestId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveDraft = useCallback(async (): Promise<string | null> => {
    if (!detail || readOnly) return null;
    setSaving(true);
    try {
      const res = await fetch("/api/branch/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          request_id: detail.request.id,
          template_id: detail.template.id,
          data,
          status: "draft",
        }),
      });
      const out = (await res.json()) as { report?: { id: string; updated_at: string }; error?: string };
      if (!res.ok) {
        showToast(out.error ?? "Save failed", "error");
        return null;
      }
      const id = out.report?.id ?? null;
      if (id) setReportId(id);
      setLastSavedAt(new Date().toISOString());
      return id;
    } finally {
      setSaving(false);
    }
  }, [detail, data, readOnly, showToast]);

  useEffect(() => {
    if (readOnly || !detail) return;
    timerRef.current = setInterval(() => {
      void saveDraft();
    }, 30000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [readOnly, detail, saveDraft]);

  async function onSubmitConfirmed() {
    const idFromSave = await saveDraft();
    const rid = idFromSave ?? reportId;
    if (!rid) {
      showToast("Could not save draft — try again", "error");
      setConfirmOpen(false);
      return;
    }
    setSubmitting(true);
    try {
      if (isHrTemplate && staffRows.length > 0) {
        const weekStart = detail.request.period_start;
        const weekEnd = detail.request.period_end;
        const staffRes = await fetch("/api/branch/staff-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            report_id: rid,
            period_start: weekStart,
            period_end: weekEnd,
            entries: staffRows,
          }),
        });
        if (!staffRes.ok) {
          const j = (await staffRes.json()) as { error?: string };
          showToast(j.error ?? "Failed to save staff entries", "error");
          return;
        }
      }

      const res = await fetch(`/api/branch/reports/${rid}/submit`, { method: "POST" });
      const out = (await res.json()) as { error?: string };
      if (!res.ok) {
        showToast(out.error ?? "Submit failed", "error");
        return;
      }
      setConfirmOpen(false);
      router.push("/branch/reports?toast=submitted");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  const urgency = detail ? urgencyForDueDate(detail.request.due_date) : "upcoming";

  const fields = useMemo(() => detail?.template.fields ?? [], [detail]);

  if (loading || !detail) {
    return <p className="text-[#9ca3af]">{loading ? "Loading…" : "Not found."}</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {isRevisionRequired && detail.report?.revision_comment ? (
        <div className="rounded-xl border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <p className="font-semibold text-amber-200">Revision requested</p>
          <p className="mt-2 whitespace-pre-wrap">{detail.report.revision_comment}</p>
          <p className="mt-2 text-xs text-amber-200/80">Update the report below and submit again when ready.</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#f9fafb]">{detail.request.title}</h1>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {detail.template.title} · <span className="capitalize text-[#e5e7eb]">{detail.template.type}</span>
          </p>
          <p className="mt-3 text-sm text-[#9ca3af]">
            Period: {formatDay(detail.request.period_start)} → {formatDay(detail.request.period_end)}
          </p>
          <p className="mt-1 text-sm text-[#9ca3af]">
            Due {formatDay(detail.request.due_date)}{" "}
            {urgency === "overdue" ? (
              <span className="ml-2 text-red-400">(Overdue)</span>
            ) : urgency === "today" ? (
              <span className="ml-2 text-amber-400">(Due today)</span>
            ) : (
              <span className="ml-2 text-[#6b7280]">(Due in {daysUntilDue(detail.request.due_date)} days)</span>
            )}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#9ca3af]">
            Status:{" "}
            <span className={`rounded-full px-2 py-0.5 ${reportStatusClass(detail.report?.status ?? "draft")}`}>
              {reportStatusLabel(detail.report?.status ?? "draft")}
            </span>
          </p>
        </div>
        <div className="text-right text-xs text-[#9ca3af]">
          {lastSavedAt ? (
            <p>
              Saved{" "}
              <span className="font-medium text-emerald-400">
                {new Intl.DateTimeFormat("en-GB", { timeStyle: "short", dateStyle: "short" }).format(new Date(lastSavedAt))}
              </span>
            </p>
          ) : (
            <p>Not saved yet</p>
          )}
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-[#1f2937] bg-[#111827] p-6">
        {fields.map((field) => (
          <TemplateFieldRenderer
            key={field.id}
            field={field}
            value={data[field.id]}
            readOnly={readOnly}
            onChange={readOnly ? undefined : (v) => setData((d) => ({ ...d, [field.id]: v }))}
          />
        ))}
      </div>

      {isHrTemplate ? (
        <div className="space-y-3 rounded-2xl border border-[#1f2937] bg-[#111827] p-6">
          <h2 className="text-lg font-semibold text-[#f9fafb]">Staff hours this week</h2>
          <p className="text-sm text-[#9ca3af]">Enter hours per registered staff member.</p>
          <StaffReportTable readOnly={readOnly} value={staffRows} onChange={setStaffRows} />
        </div>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" disabled={saving} onClick={() => void saveDraft()}>
            {saving ? "Saving…" : "Save Draft"}
          </Button>
          <Button type="button" onClick={() => setConfirmOpen(true)}>
            Submit Report
          </Button>
        </div>
      ) : null}

      <Modal
        open={confirmOpen}
        title="Submit report?"
        onClose={() => setConfirmOpen(false)}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={submitting} onClick={() => void onSubmitConfirmed()}>
              {submitting ? "Submitting…" : "Confirm submit"}
            </Button>
          </>
        }
      >
        <p className="text-[#9ca3af]">
          {isRevisionRequired
            ? "Submit the revised report when corrections are complete."
            : "Are you sure you want to submit? You cannot edit after submitting."}
        </p>
      </Modal>
    </div>
  );
}
