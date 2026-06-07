"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { OnboardingFieldRenderer } from "@/components/onboarding/onboarding-field-renderer";
import { Button } from "@/components/ui/Button";
import type { FormField } from "@/lib/company-forms/fields";
import type { CompanyFormModule } from "@/lib/company-forms/modules";

export function PublicCompanyForm({ module, token, apiPrefix }: { module: CompanyFormModule; token: string; apiPrefix: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiPrefix}/${token}`);
      const json = (await res.json()) as {
        template_title?: string;
        subject_name?: string;
        fields?: FormField[];
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Unavailable");
      setTitle(json.template_title ?? "");
      setSubjectName(json.subject_name ?? "");
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
        body: JSON.stringify({ data }),
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

  if (loading) return <div className="flex justify-center gap-2 text-[#9ca3af]"><Loader2 className="size-5 animate-spin" /> Loading…</div>;
  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-400" />
        <h2 className="mt-4 text-xl font-semibold text-white">Thank you!</h2>
        <p className="mt-2 text-sm text-[#9ca3af]">Your submission was received.</p>
      </div>
    );
  }
  if (error && fields.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-500/30 p-8 text-center">
        <h2 className="text-lg font-semibold text-white">Form unavailable</h2>
        <p className="mt-2 text-sm text-[#9ca3af]">{error}</p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="mx-auto max-w-xl space-y-6">
      <header className="text-center">
        {subjectName ? <p className="text-sm text-[#9ca3af]">For {subjectName}</p> : null}
        <h1 className="text-2xl font-bold text-white">{title}</h1>
      </header>
      <div className="space-y-4 rounded-2xl border border-[#1f2937] bg-[#111827] p-6">
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
        {module === "policy" ? "I acknowledge" : "Submit"}
      </Button>
    </form>
  );
}
