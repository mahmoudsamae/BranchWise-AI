"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { OnboardingFieldRenderer } from "@/components/onboarding/onboarding-field-renderer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import type { FormField } from "@/lib/company-forms/fields";
import { MODULE_CONFIG, type CompanyFormModule } from "@/lib/company-forms/modules";

export function SubmissionDetail({ module, submissionId }: { module: CompanyFormModule; submissionId: string }) {
  const cfg = MODULE_CONFIG[module];
  const apiBase = `/api/hr/company-forms/${module}`;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [submission, setSubmission] = useState<{
    id: string;
    status: string;
    submitted_at: string;
    subject_name: string | null;
    template_title: string | null;
    branch_name: string | null;
    fields: FormField[];
    data: Record<string, unknown>;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/submissions/${submissionId}`);
      const json = (await res.json()) as { submission?: typeof submission; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Not found");
      setSubmission(json.submission ?? null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  }, [apiBase, submissionId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  async function markReviewed() {
    setMarking(true);
    try {
      const status = module === "policy" ? "acknowledged" : "reviewed";
      const res = await fetch(`${apiBase}/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast("Updated", "success");
      await load();
    } catch {
      showToast("Failed", "error");
    } finally {
      setMarking(false);
    }
  }

  if (loading) return <Loader2 className="size-4 animate-spin text-[#9ca3af]" />;
  if (!submission) return <p className="text-[#9ca3af]">Not found</p>;

  return (
    <div className="space-y-6">
      <Link href={`${cfg.hrPath}?view=submissions`} className="inline-flex items-center gap-1 text-sm text-[#9ca3af] hover:text-white">
        <ArrowLeft className="size-4" /> Back
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{submission.subject_name ?? submission.template_title ?? "Submission"}</h1>
          <p className="text-sm text-[#9ca3af]">{submission.template_title} {submission.branch_name ? `· ${submission.branch_name}` : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={submission.status === "reviewed" || submission.status === "acknowledged" ? "green" : "yellow"}>
            {submission.status}
          </Badge>
          {submission.status === "submitted" ? (
            <Button type="button" variant="secondary" onClick={() => void markReviewed()} disabled={marking}>
              {marking ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              Mark reviewed
            </Button>
          ) : null}
        </div>
      </div>
      <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6">
        <div className="grid gap-4">
          {submission.fields.map((field) => (
            <OnboardingFieldRenderer key={field.id} field={field} value={submission.data[field.id]} readOnly />
          ))}
        </div>
      </div>
    </div>
  );
}
