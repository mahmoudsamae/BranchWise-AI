"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { SubmissionFieldDisplay } from "@/components/onboarding/submission-field-display";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import type { OnboardingField } from "@/lib/onboarding/template-fields";

type SubmissionDetail = {
  id: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  data: Record<string, unknown>;
  fields: OnboardingField[];
  invite: {
    employee_name: string;
    template_title: string | null;
    created_at: string;
    submitted_at: string | null;
  } | null;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function SubmissionDetail({ submissionId }: { submissionId: string }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [marking, setMarking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/onboarding/submissions/${submissionId}`);
      const json = (await res.json()) as { submission?: SubmissionDetail; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Not found");
      setSubmission(json.submission ?? null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }, [submissionId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const { profileFields, documentFields } = useMemo(() => {
    if (!submission) return { profileFields: [], documentFields: [] };
    const docs = submission.fields.filter((f) => f.type === "file");
    const profile = submission.fields.filter((f) => f.type !== "file");
    return { profileFields: profile, documentFields: docs };
  }, [submission]);

  async function markReviewed() {
    setMarking(true);
    try {
      const res = await fetch(`/api/hr/onboarding/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Failed");
      }
      showToast("Marked as reviewed", "success");
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#9ca3af]">
        <Loader2 className="size-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!submission) {
    return <p className="text-[#9ca3af]">Submission not found.</p>;
  }

  const employeeName = submission.invite?.employee_name ?? "Employee dossier";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-lg font-bold text-indigo-200">
            {initials(employeeName) || "?"}
          </span>
          <div>
            <Link href="/hr/onboarding?view=submissions" className="mb-2 inline-flex items-center gap-1 text-sm text-[#9ca3af] hover:text-white">
              <ArrowLeft className="size-4" />
              Back to submissions
            </Link>
            <h1 className="text-2xl font-bold text-white">{employeeName}</h1>
            <p className="mt-1 text-sm text-[#9ca3af]">{submission.invite?.template_title ?? "Onboarding"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={submission.status === "reviewed" ? "green" : "yellow"}>
            {submission.status === "reviewed" ? "Reviewed" : "Submitted"}
          </Badge>
          {submission.status !== "reviewed" ? (
            <Button type="button" variant="secondary" onClick={() => void markReviewed()} disabled={marking}>
              {marking ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Mark reviewed
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">Submitted</p>
          <p className="mt-1 text-sm font-medium text-white">{formatDate(submission.submitted_at)}</p>
        </div>
        <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">Reviewed</p>
          <p className="mt-1 text-sm font-medium text-white">{formatDate(submission.reviewed_at)}</p>
        </div>
      </div>

      {profileFields.length > 0 ? (
        <section className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6">
          <h2 className="text-lg font-semibold text-white">Personal details</h2>
          <p className="mt-1 text-sm text-[#6b7280]">Information provided by the employee</p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {profileFields.map((field) => (
              <SubmissionFieldDisplay key={field.id} field={field} value={submission.data[field.id]} />
            ))}
          </div>
        </section>
      ) : null}

      {documentFields.length > 0 ? (
        <section className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-indigo-300" />
            <h2 className="text-lg font-semibold text-white">Documents</h2>
          </div>
          <p className="mt-1 text-sm text-[#6b7280]">{documentFields.length} file{documentFields.length === 1 ? "" : "s"} attached</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {documentFields.map((field) => (
              <SubmissionFieldDisplay key={field.id} field={field} value={submission.data[field.id]} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
