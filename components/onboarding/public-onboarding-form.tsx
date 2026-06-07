"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { OnboardingFieldRenderer } from "@/components/onboarding/onboarding-field-renderer";
import { Button } from "@/components/ui/Button";
import type { OnboardingField } from "@/lib/onboarding/template-fields";

type FormPayload = {
  employee_name: string;
  template_title: string;
  fields: OnboardingField[];
  status: string;
  expires_at: string;
};

export function PublicOnboardingForm({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormPayload | null>(null);
  const [data, setData] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/onboarding/${token}`);
      const json = (await res.json()) as FormPayload & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Could not load form");
      setForm(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load form");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/onboarding/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Submission failed");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-[#9ca3af]">
        <Loader2 className="size-5 animate-spin" />
        Loading form…
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-8 text-center">
        <CheckCircle2 className="mx-auto size-12 text-emerald-400" />
        <h2 className="mt-4 text-xl font-semibold text-white">Thank you!</h2>
        <p className="mt-2 text-sm text-[#9ca3af]">Your information has been submitted successfully. HR will be in touch.</p>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-red-500/30 bg-red-950/20 p-8 text-center">
        <h2 className="text-lg font-semibold text-white">Form unavailable</h2>
        <p className="mt-2 text-sm text-[#9ca3af]">{error}</p>
      </div>
    );
  }

  if (!form) return null;

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="mx-auto max-w-xl space-y-6">
      <header className="space-y-2 text-center">
        <p className="text-sm text-[#9ca3af]">Onboarding form for</p>
        <h1 className="text-2xl font-bold text-white">{form.employee_name}</h1>
        <p className="text-sm text-[#6b7280]">{form.template_title}</p>
      </header>

      <div className="space-y-4 rounded-2xl border border-[#1f2937] bg-[#111827] p-6">
        {form.fields.map((field) => (
          <OnboardingFieldRenderer
            key={field.id}
            field={field}
            value={data[field.id]}
            uploadToken={token}
            onChange={(v) => setData((prev) => ({ ...prev, [field.id]: v }))}
          />
        ))}
      </div>

      {error ? <p className="text-center text-sm text-red-400">{error}</p> : null}

      <Button type="submit" className="w-full justify-center" disabled={submitting}>
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Submit
      </Button>
    </form>
  );
}
