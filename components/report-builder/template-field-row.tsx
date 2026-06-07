"use client";

import type { DragEvent, HTMLAttributes, Ref } from "react";
import { AlignLeft, Calendar, GripVertical, Hash, List, ToggleLeft, Trash2, Type } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { FieldType, TemplateField } from "@/lib/report-builder/template-fields";

const PALETTE_MIME = "application/bw-palette-type";
const FIELD_INDEX_MIME = "application/bw-field-index";

export { PALETTE_MIME, FIELD_INDEX_MIME };

function fieldIcon(type: FieldType) {
  const cls = "size-4 shrink-0 text-[#a5b4fc]";
  switch (type) {
    case "text":
      return <Type className={cls} aria-hidden />;
    case "number":
      return <Hash className={cls} aria-hidden />;
    case "textarea":
      return <AlignLeft className={cls} aria-hidden />;
    case "select":
      return <List className={cls} aria-hidden />;
    case "boolean":
      return <ToggleLeft className={cls} aria-hidden />;
    case "date":
      return <Calendar className={cls} aria-hidden />;
    default:
      return <Type className={cls} aria-hidden />;
  }
}

export function TemplateFieldRow({
  field,
  index,
  onChange,
  onRemove,
  dragHandleRef,
  dragHandleProps,
  onRowDrop,
}: {
  field: TemplateField;
  index: number;
  onChange: (next: TemplateField) => void;
  onRemove: () => void;
  dragHandleRef?: Ref<HTMLButtonElement>;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
  onRowDrop?: (e: DragEvent) => void;
}) {
  return (
    <div
      data-field-index={index}
      className="flex flex-col gap-3 rounded-xl border border-[#1f2937] bg-[#111827] p-4 sm:flex-row sm:items-start"
      onDragOver={
        onRowDrop
          ? (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }
          : undefined
      }
      onDrop={onRowDrop}
    >
      <button
        type="button"
        ref={dragHandleRef}
        {...dragHandleProps}
        className="mt-1 flex size-9 shrink-0 cursor-grab items-center justify-center rounded-lg border border-[#1f2937] text-[#9ca3af] active:cursor-grabbing hover:border-[#6366f1]/50 hover:text-[#f9fafb]"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {fieldIcon(field.type)}
          <span className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">{field.type}</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
            <span className="text-xs font-medium text-[#9ca3af]">Label</span>
            <input
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value })}
              className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1]"
            />
          </div>
          <div className="grid gap-1">
            <span className="text-xs font-medium text-[#9ca3af]">Placeholder</span>
            <input
              value={field.placeholder ?? ""}
              onChange={(e) => onChange({ ...field, placeholder: e.target.value })}
              className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1]"
            />
          </div>
        </div>
        {field.type === "select" ? (
          <div className="grid gap-2">
            <span className="text-xs font-medium text-[#9ca3af]">Options</span>
            {(field.options ?? []).map((opt, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={opt}
                  onChange={(e) => {
                    const next = [...(field.options ?? [])];
                    next[i] = e.target.value;
                    onChange({ ...field, options: next });
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="shrink-0 px-2"
                  onClick={() => {
                    const next = (field.options ?? []).filter((_, j) => j !== i);
                    onChange({ ...field, options: next.length ? next : ["Option 1"] });
                  }}
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              className="w-fit"
              onClick={() =>
                onChange({ ...field, options: [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`] })
              }
            >
              Add option
            </Button>
          </div>
        ) : null}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-[#d1d5db]">
          <input
            type="checkbox"
            checked={field.required ?? false}
            onChange={(e) => onChange({ ...field, required: e.target.checked })}
            className="size-4 rounded border-[#1f2937] bg-[#0a0f1e] text-[#6366f1] focus:ring-[#6366f1]/40"
          />
          Required
        </label>
      </div>
      <Button type="button" variant="danger" className="shrink-0 self-start px-3" onClick={onRemove} aria-label="Delete field">
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}

export function PaletteDragItem({ type, label }: { type: FieldType; label: string }) {
  return (
    <div
      draggable
      onDragStart={(e: DragEvent) => {
        e.dataTransfer.setData(PALETTE_MIME, type);
        e.dataTransfer.setData("text/plain", type);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2.5 text-sm font-medium text-[#e5e7eb] active:cursor-grabbing",
      )}
    >
      {label}
    </div>
  );
}
