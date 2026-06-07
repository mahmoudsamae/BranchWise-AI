"use client";

import { Loader2, Send } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

type TemplateOption = { id: string; title: string };
type StaffRow = { id: string; full_name: string; is_active: boolean };

export function BulkPolicyModal({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone?: () => void }) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelected(new Set());
    setLoading(true);
    Promise.all([
      fetch("/api/hr/company-forms/policy/templates").then((r) => r.json()),
      fetch("/api/hr/staff").then((r) => r.json()),
    ])
      .then(([t, s]: [{ templates?: TemplateOption[] }, { staff?: StaffRow[] }]) => {
        setTemplates(t.templates ?? []);
        setStaff((s.staff ?? []).filter((row) => row.is_active));
      })
      .finally(() => setLoading(false));
  }, [open]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function sendAll() {
    if (!templateId || selected.size === 0) {
      showToast("Select template and staff", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/hr/company-forms/policy/bulk-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_id: templateId, staff_ids: [...selected] }),
      });
      const json = (await res.json()) as { created?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      showToast(`Created ${json.created ?? 0} policy links`, "success");
      onDone?.();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Send policy to staff"
      onClose={onClose}
      className="max-w-2xl"
      footer={
        <Button type="button" onClick={() => void sendAll()} disabled={submitting || loading}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send to {selected.size} staff
        </Button>
      }
    >
      <div className="space-y-4">
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
        >
          <option value="">Select policy template…</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
        <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-[#1f2937] p-3">
          {staff.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm text-[#e5e7eb]">
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
              {s.full_name}
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}
