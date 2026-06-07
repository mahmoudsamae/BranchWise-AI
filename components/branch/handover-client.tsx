"use client";

import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { OnboardingFieldRenderer } from "@/components/onboarding/onboarding-field-renderer";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { FormField } from "@/lib/company-forms/fields";

type Template = { id: string; title: string; fields: FormField[] | null };
type Submission = { id: string; template_title: string | null; shift_date: string | null; submitted_at: string };

export function HandoverClient() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateId, setTemplateId] = useState("");
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [qrLink, setQrLink] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [handoverRes, qrRes] = await Promise.all([
        fetch("/api/branch/handover"),
        fetch("/api/branch/incident-qr"),
      ]);
      const handover = (await handoverRes.json()) as { templates?: Template[]; submissions?: Submission[]; error?: string };
      const qr = (await qrRes.json()) as { link?: string };
      if (!handoverRes.ok) throw new Error(handover.error ?? "Failed");
      setTemplates(handover.templates ?? []);
      setSubmissions(handover.submissions ?? []);
      setQrLink(qr.link ?? null);
      if (handover.templates?.length === 1 && handover.templates[0]) {
        setTemplateId(handover.templates[0].id);
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeTemplate = templates.find((t) => t.id === templateId);
  const fields = (activeTemplate?.fields ?? []) as FormField[];

  async function submit() {
    if (!templateId) {
      showToast("Select a handover template", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/branch/handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId, shift_date: shiftDate, data }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      showToast("Handover saved", "success");
      setData({});
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loader2 className="size-5 animate-spin text-[#9ca3af]" />;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-white">Shift Handover</h1>
        <p className="mt-2 text-sm text-[#9ca3af]">Log end-of-shift notes, issues, and handover details for your branch.</p>
        {qrLink ? (
          <p className="mt-2 text-xs text-[#6b7280]">
            Incident QR for this branch:{" "}
            <Link href={qrLink} className="text-[#a5b4fc] hover:underline" target="_blank">
              {qrLink}
            </Link>
          </p>
        ) : null}
      </header>

      {templates.length === 0 ? (
        <p className="text-amber-400">No handover template yet. Ask HR to create one under Shift Handover templates.</p>
      ) : (
        <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm text-[#9ca3af]">Template</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              >
                <option value="">Select…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-[#9ca3af]">Shift date</label>
              <input
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              />
            </div>
          </div>
          {fields.map((field) => (
            <OnboardingFieldRenderer
              key={field.id}
              field={field}
              value={data[field.id]}
              onChange={(v) => setData((p) => ({ ...p, [field.id]: v }))}
            />
          ))}
          <Button type="button" onClick={() => void submit()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save handover
          </Button>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-white">Recent handovers</h2>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Template</TableCell>
              <TableCell>Shift date</TableCell>
              <TableCell>Submitted</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{s.template_title ?? "—"}</TableCell>
                <TableCell>{s.shift_date ?? "—"}</TableCell>
                <TableCell>{new Date(s.submitted_at).toLocaleString("de-DE")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
