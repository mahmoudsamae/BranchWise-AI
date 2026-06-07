"use client";

import type { OpsColumn } from "@/lib/branch-ops/columns";

type StaffOption = { id: string; full_name: string };

export function OpsColumnField({
  column,
  value,
  onChange,
  staff,
  disabled,
}: {
  column: OpsColumn;
  value: unknown;
  onChange?: (v: unknown) => void;
  staff: StaffOption[];
  disabled?: boolean;
}) {
  const ro = disabled || !onChange;
  const label = (
    <span className="text-sm font-medium text-[#9ca3af]">
      {column.label}
      {column.required ? <span className="text-red-400"> *</span> : null}
    </span>
  );

  if (column.type === "boolean") {
    const checked = value === true || value === "true" || value === 1;
    return (
      <label className="flex items-center justify-between gap-3 rounded-lg border border-[#1f2937] bg-[#0a0f1e]/60 px-3 py-2">
        {label}
        <input
          type="checkbox"
          checked={checked}
          disabled={ro}
          onChange={(e) => onChange?.(e.target.checked)}
          className="size-5 rounded"
        />
      </label>
    );
  }

  if (column.type === "staff") {
    return (
      <div className="grid gap-1">
        {label}
        <select
          value={typeof value === "string" ? value : ""}
          disabled={ro}
          onChange={(e) => onChange?.(e.target.value)}
          className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white disabled:opacity-60"
        >
          <option value="">Select staff…</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>
      </div>
    );
  }

  if (column.type === "select" && column.options?.length) {
    return (
      <div className="grid gap-1">
        {label}
        <select
          value={typeof value === "string" ? value : ""}
          disabled={ro}
          onChange={(e) => onChange?.(e.target.value)}
          className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
        >
          <option value="">Select…</option>
          {column.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>
    );
  }

  if (column.type === "textarea") {
    return (
      <div className="grid gap-1">
        {label}
        <textarea
          value={typeof value === "string" ? value : ""}
          disabled={ro}
          onChange={(e) => onChange?.(e.target.value)}
          rows={2}
          className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
        />
      </div>
    );
  }

  if (column.type === "number") {
    return (
      <div className="grid gap-1">
        {label}
        <input
          type="number"
          value={value === undefined || value === null || value === "" ? "" : Number(value)}
          disabled={ro}
          onChange={(e) => onChange?.(e.target.value === "" ? "" : Number(e.target.value))}
          className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
        />
      </div>
    );
  }

  if (column.type === "date") {
    return (
      <div className="grid gap-1">
        {label}
        <input
          type="date"
          value={typeof value === "string" ? value : ""}
          disabled={ro}
          onChange={(e) => onChange?.(e.target.value)}
          className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      {label}
      <input
        type="text"
        value={typeof value === "string" ? value : value === undefined || value === null ? "" : String(value)}
        disabled={ro}
        onChange={(e) => onChange?.(e.target.value)}
        className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
      />
    </div>
  );
}
