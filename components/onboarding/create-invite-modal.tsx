"use client";

import { Check, Copy, Link2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

type TemplateOption = { id: string; title: string; is_active?: boolean | null };

type CreatedInvite = {
  link: string;
  employee_name: string;
  template_title: string | null;
};

export function CreateInviteModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedInvite | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCreated(null);
    setCopied(false);
    setEmployeeName("");
    setTemplateId("");
    setLoadingTemplates(true);
    void fetch("/api/hr/onboarding/templates")
      .then((r) => r.json())
      .then((json: { templates?: TemplateOption[] }) => {
        const active = (json.templates ?? []).filter((t) => t.is_active !== false);
        setTemplates(active);
        if (active.length === 1 && active[0]) setTemplateId(active[0].id);
      })
      .catch(() => showToast("Failed to load templates", "error"))
      .finally(() => setLoadingTemplates(false));
  }, [open, showToast]);

  async function handleCreate() {
    const name = employeeName.trim();
    if (!name) {
      showToast("Employee name is required", "error");
      return;
    }
    if (!templateId) {
      showToast("Select a template", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/hr/onboarding/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employee_name: name, template_id: templateId }),
      });
      const json = (await res.json()) as {
        invite?: { link: string; employee_name: string; template_title: string | null };
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to create link");
      const invite = json.invite;
      if (!invite) throw new Error("Invalid response");
      setCreated({
        link: invite.link,
        employee_name: invite.employee_name,
        template_title: invite.template_title,
      });
      onCreated?.();
      showToast("Link created", "success");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!created?.link) return;
    try {
      await navigator.clipboard.writeText(created.link);
      setCopied(true);
      showToast("Link copied", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("Could not copy — select and copy manually", "error");
    }
  }

  return (
    <Modal
      open={open}
      title={created ? "Link ready" : "New employee link"}
      onClose={onClose}
      footer={
        created ? (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={() => void copyLink()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              Copy link
            </Button>
          </div>
        ) : (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={submitting || loadingTemplates}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
              Create link
            </Button>
          </div>
        )
      }
    >
      {created ? (
        <div className="space-y-4">
          <p className="text-[#9ca3af]">
            Send this personal link to <strong className="text-white">{created.employee_name}</strong> so they can fill
            out <strong className="text-white">{created.template_title ?? "the form"}</strong>.
          </p>
          <div className="break-all rounded-lg border border-[#374151] bg-[#0a0f1e] p-3 font-mono text-xs text-[#a5b4fc]">
            {created.link}
          </div>
          <p className="text-xs text-[#6b7280]">Link expires in 14 days. One submission per link.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-[#9ca3af]">Employee name</label>
            <input
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="e.g. Max Mustermann"
              className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1]"
            />
          </div>
          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-[#9ca3af]">Template</label>
            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-sm text-[#6b7280]">
                <Loader2 className="size-4 animate-spin" /> Loading templates…
              </div>
            ) : templates.length === 0 ? (
              <p className="text-sm text-amber-400">Create a template first before generating links.</p>
            ) : (
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1]"
              >
                <option value="">Select template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
