"use client";

import { cn } from "@/lib/cn";
import type { TemplateField } from "@/lib/report-builder/template-fields";

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

export type TemplateFieldRendererProps = {
  field: TemplateField;
  value: unknown;
  onChange?: (v: unknown) => void;
  readOnly?: boolean;
};

export function TemplateFieldRenderer({ field, value, onChange, readOnly = false }: TemplateFieldRendererProps) {
  const disabled = readOnly || !onChange;
  const label = (
    <span>
      {field.label}
      {field.required ? <span className="text-red-400"> *</span> : null}
    </span>
  );
  const common = { disabled };

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

  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-[#9ca3af]">{label}</label>
      <input
        type="text"
        {...common}
        placeholder={field.placeholder}
        value={typeof value === "string" ? value : value === undefined || value === null ? "" : String(value)}
        onChange={(e) => onChange?.(e.target.value)}
        className="w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1] disabled:opacity-60"
      />
    </div>
  );
}
