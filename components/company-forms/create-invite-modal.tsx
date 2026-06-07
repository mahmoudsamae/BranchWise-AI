"use client";

import { Check, Copy, Link2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import type { CompanyFormModule } from "@/lib/company-forms/modules";

type StaffOption = { id: string; full_name: string };
type TemplateOption = { id: string; title: string; is_active?: boolean | null };

export function CreateInviteModal({
  module,
  open,
  onClose,
  onCreated,
}: {
  module: CompanyFormModule;
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const apiBase = `/api/hr/company-forms/${module}`;
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [staffMemberId, setStaffMemberId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLink(null);
    setCopied(false);
    setEmployeeName("");
    setStaffMemberId("");
    setTemplateId("");
    setLoading(true);
    Promise.all([
      fetch(`${apiBase}/templates`).then((r) => r.json()),
      fetch("/api/hr/staff").then((r) => r.json()),
    ])
      .then(([tJson, sJson]: [{ templates?: TemplateOption[] }, { staff?: StaffOption[] }]) => {
        const active = (tJson.templates ?? []).filter((t) => t.is_active !== false);
        setTemplates(active);
        setStaff((sJson.staff ?? []).map((s) => ({ id: s.id, full_name: s.full_name })));
        if (active.length === 1 && active[0]) setTemplateId(active[0].id);
      })
      .catch(() => showToast("Failed to load data", "error"))
      .finally(() => setLoading(false));
  }, [open, apiBase, showToast]);

  useEffect(() => {
    if (!staffMemberId) return;
    const found = staff.find((s) => s.id === staffMemberId);
    if (found) setEmployeeName(found.full_name);
  }, [staffMemberId, staff]);

  async function handleCreate() {
    if (!employeeName.trim() || !templateId) {
      showToast("Name and template required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_name: employeeName.trim(),
          template_id: templateId,
          staff_member_id: staffMemberId || undefined,
        }),
      });
      const json = (await res.json()) as { invite?: { link: string }; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setLink(json.invite?.link ?? null);
      onCreated?.();
      showToast("Link created", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={link ? "Link ready" : "Create link"}
      onClose={onClose}
      footer={
        link ? (
          <Button type="button" onClick={() => void navigator.clipboard.writeText(link).then(() => setCopied(true))}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copy
          </Button>
        ) : (
          <Button type="button" onClick={() => void handleCreate()} disabled={submitting || loading}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />} Create link
          </Button>
        )
      }
    >
      {link ? (
        <p className="break-all font-mono text-xs text-[#a5b4fc]">{link}</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-[#9ca3af]">Staff member</label>
            <select
              value={staffMemberId}
              onChange={(e) => setStaffMemberId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
            >
              <option value="">Select or type name below…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-[#9ca3af]">Name on link</label>
            <input
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
            />
          </div>
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
        </div>
      )}
    </Modal>
  );
}
