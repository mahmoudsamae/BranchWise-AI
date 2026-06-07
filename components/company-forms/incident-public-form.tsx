"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { OnboardingFieldRenderer } from "@/components/onboarding/onboarding-field-renderer";
import { Button } from "@/components/ui/Button";
import type { FormField } from "@/lib/company-forms/fields";

export function IncidentPublicForm({ token }: { token: string }) {
  const apiPrefix = `/api/incident`;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchName, setBranchName] = useState("");
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [reporterName, setReporterName] = useState("");
  const [data, setData] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiPrefix}/${token}`);
      const json = (await res.json()) as { branch_name?: string; template_title?: string; fields?: FormField[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Unavailable");
      setBranchName(json.branch_name ?? "");
      setTitle(json.template_title ?? "Incident report");
      setFields(json.fields ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unavailable");
    } finally {
      setLoading(false);
    }
  }, [apiPrefix, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${apiPrefix}/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, reporter_name: reporterName }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <Loader2 className="mx-auto size-5 animate-spin text-[#9ca3af]" />;
  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-400" />
        <h2 className="mt-4 text-xl font-semibold text-white">Report submitted</h2>
        <p className="mt-2 text-sm text-[#9ca3af]">Thank you. Management has been notified.</p>
      </div>
    );
  }
  if (error && !fields.length) {
    return <p className="text-center text-red-400">{error}</p>;
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mx-auto max-w-xl space-y-6">
      <header className="text-center">
        <p className="text-sm text-[#9ca3af]">{branchName}</p>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
      </header>
      <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 space-y-4">
        <div>
          <label className="text-sm text-[#9ca3af]">Your name (optional)</label>
          <input
            value={reporterName}
            onChange={(e) => setReporterName(e.target.value)}
            placeholder="Anonymous"
            className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
          />
        </div>
        {fields.map((field) => (
          <OnboardingFieldRenderer
            key={field.id}
            field={field}
            value={data[field.id]}
            uploadUrl={`${apiPrefix}/${token}/upload`}
            onChange={(v) => setData((p) => ({ ...p, [field.id]: v }))}
          />
        ))}
      </div>
      {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}
      <Button type="submit" className="w-full justify-center" disabled={submitting}>
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Submit report
      </Button>
    </form>
  );
}
