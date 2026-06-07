"use client";

import { FileText, Loader2, Upload, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  isOnboardingFileValue,
  type OnboardingField,
  type OnboardingFileValue,
} from "@/lib/onboarding/template-fields";

function ToggleBool({
  value,
  disabled,
  onChange,
}: {
  value: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => onChange?.(!value)}
      className={cn(
        "relative h-8 w-14 shrink-0 rounded-full border transition",
        value ? "border-emerald-500/50 bg-emerald-600/40" : "border-[#374151] bg-[#374151]",
        disabled && "opacity-50",
      )}
    >
      <span className={cn("absolute top-1 size-6 rounded-full bg-white transition", value ? "left-7" : "left-1")} />
      <span className="sr-only">{value ? "Yes" : "No"}</span>
    </button>
  );
}

export type OnboardingFieldRendererProps = {
  field: OnboardingField;
  value: unknown;
  onChange?: (v: unknown) => void;
  readOnly?: boolean;
  uploadToken?: string;
  /** Full upload endpoint URL; defaults to /api/onboarding/{uploadToken}/upload */
  uploadUrl?: string;
};

export function OnboardingFieldRenderer({
  field,
  value,
  onChange,
  readOnly = false,
  uploadToken,
  uploadUrl,
}: OnboardingFieldRendererProps) {
  const disabled = readOnly || !onChange;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const label = (
    <span>
      {field.label}
      {field.required ? <span className="text-red-400"> *</span> : null}
    </span>
  );
  const common = { disabled };

  async function handleFileUpload(file: File) {
    const endpoint = uploadUrl ?? (uploadToken ? `/api/onboarding/${uploadToken}/upload` : null);
    if (!endpoint || !onChange) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.set("field_id", field.id);
      formData.set("file", file);
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const json = (await res.json()) as { file?: OnboardingFileValue; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onChange(json.file);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  if (field.type === "file") {
    const fileVal = isOnboardingFileValue(value) ? value : null;
    const signedUrl = readOnly && fileVal && "signedUrl" in fileVal ? (fileVal as OnboardingFileValue & { signedUrl?: string }).signedUrl : null;

    return (
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-[#9ca3af]">{label}</label>
        {readOnly && fileVal ? (
          <a
            href={signedUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#a5b4fc] hover:border-[#6366f1]/50"
          >
            <FileText className="size-4 shrink-0" />
            {fileVal.fileName}
          </a>
        ) : (
          <div className="space-y-2">
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
              className="hidden"
              disabled={disabled || uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFileUpload(f);
                e.target.value = "";
              }}
            />
            {fileVal ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2">
                <div className="flex min-w-0 items-center gap-2 text-sm text-[#e5e7eb]">
                  <FileText className="size-4 shrink-0 text-[#a5b4fc]" />
                  <span className="truncate">{fileVal.fileName}</span>
                </div>
                {!disabled ? (
                  <Button type="button" variant="ghost" size="sm" className="px-2" onClick={() => onChange?.(undefined)}>
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
                className="w-full justify-center gap-2"
              >
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {uploading ? "Uploading…" : "Choose file (PDF, image, Word — max 10 MB)"}
              </Button>
            )}
            {uploadError ? <p className="text-xs text-red-400">{uploadError}</p> : null}
          </div>
        )}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-[#9ca3af]">{label}</label>
        <textarea
          {...common}
          placeholder={field.placeholder}
          value={typeof value === "string" ? value : value === undefined || value === null ? "" : String(value)}
          onChange={(e) => onChange?.(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1] disabled:opacity-60"
        />
      </div>
    );
  }

  if (field.type === "select" && field.options?.length) {
    return (
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-[#9ca3af]">{label}</label>
        <select
          {...common}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange?.(e.target.value)}
          className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1] disabled:opacity-60"
        >
          <option value="">Select…</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "boolean") {
    const checked = value === true || value === "true" || value === 1 || value === "1";
    return (
      <div className="flex items-center justify-between gap-4 rounded-lg border border-[#1f2937] bg-[#0a0f1e]/50 px-4 py-3">
        <span className="text-sm font-medium text-[#9ca3af]">{label}</span>
        <div className="flex items-center gap-2 text-sm text-[#e5e7eb]">
          <span>No</span>
          <ToggleBool value={checked} disabled={disabled} onChange={onChange ? (nv) => onChange(nv) : undefined} />
          <span>Yes</span>
        </div>
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-[#9ca3af]">{label}</label>
        <input
          type="date"
          {...common}
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1] disabled:opacity-60"
        />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-[#9ca3af]">{label}</label>
        <input
          type="number"
          {...common}
          placeholder={field.placeholder}
          value={value === undefined || value === null || value === "" ? "" : Number(value)}
          onChange={(e) => onChange?.(e.target.value === "" ? "" : Number(e.target.value))}
          className="w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1] disabled:opacity-60"
        />
      </div>
    );
  }

  const inputType = field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text";

  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-[#9ca3af]">{label}</label>
      <input
        type={inputType}
        {...common}
        placeholder={field.placeholder}
        value={typeof value === "string" ? value : value === undefined || value === null ? "" : String(value)}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1] disabled:opacity-60"
      />
    </div>
  );
}
