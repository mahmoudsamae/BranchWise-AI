"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";

type Props = {
  branchId: string;
  initialSlug: string | null;
};

export function BranchExternalIdEditor({ branchId, initialSlug }: Props) {
  const [slug, setSlug] = useState(initialSlug ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/branches/${branchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ external_id: slug.trim() || null }),
      });
      const j = (await res.json()) as { error?: string; branch?: { external_id?: string | null } };
      if (!res.ok) {
        setMessage({ type: "err", text: j.error ?? "Save failed" });
        return;
      }
      setSlug(j.branch?.external_id ?? "");
      setMessage({ type: "ok", text: "Breakfast API slug saved." });
    } catch {
      setMessage({ type: "err", text: "Request failed" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
      <h2 className="text-lg font-semibold text-white">Breakfast API slug</h2>
      <p className="mt-1 text-sm text-[#9ca3af]">
        Maps this branch to the external Frühstück system (e.g. <code className="text-[#a5b4fc]">regensburg</code>).
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm text-[#9ca3af]">
          External ID (slug)
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="regensburg"
            className="mt-1 block w-full min-w-[200px] rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white sm:w-64"
          />
        </label>
        <Button type="button" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Save
        </Button>
      </div>
      {message ? (
        <p className={`mt-3 text-sm ${message.type === "ok" ? "text-emerald-400" : "text-red-400"}`}>{message.text}</p>
      ) : null}
    </div>
  );
}
