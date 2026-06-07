"use client";

import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import type { OpsColumn, OpsColumnType } from "@/lib/branch-ops/columns";
import { OPS_COLUMN_TYPES } from "@/lib/branch-ops/columns";

export function OpsColumnEditor({
  columns,
  onChange,
}: {
  columns: OpsColumn[];
  onChange: (columns: OpsColumn[]) => void;
}) {
  function addColumn() {
    onChange([...columns, { id: `col_${Date.now()}`, type: "text", label: "New field", required: false }]);
  }

  function updateColumn(index: number, patch: Partial<OpsColumn>) {
    onChange(columns.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeColumn(index: number) {
    onChange(columns.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#9ca3af]">Columns</p>
        <Button type="button" variant="secondary" size="sm" onClick={addColumn}>
          <Plus className="size-4" /> Add column
        </Button>
      </div>
      {columns.length === 0 ? (
        <p className="text-xs text-[#6b7280]">No columns yet. Add at least one field.</p>
      ) : (
        columns.map((col, i) => (
          <div key={col.id} className="flex flex-wrap items-end gap-2 rounded-lg border border-[#1f2937] p-3">
            <div className="min-w-[120px] flex-1">
              <label className="text-xs text-[#6b7280]">Label</label>
              <input
                value={col.label}
                onChange={(e) => updateColumn(i, { label: e.target.value })}
                className="mt-1 w-full rounded border border-[#1f2937] bg-[#0a0f1e] px-2 py-1 text-sm text-white"
              />
            </div>
            <div>
              <label className="text-xs text-[#6b7280]">Type</label>
              <select
                value={col.type}
                onChange={(e) => updateColumn(i, { type: e.target.value as OpsColumnType })}
                className="mt-1 rounded border border-[#1f2937] bg-[#0a0f1e] px-2 py-1 text-sm text-white"
              >
                {OPS_COLUMN_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-1 text-xs text-[#9ca3af]">
              <input
                type="checkbox"
                checked={col.required ?? false}
                onChange={(e) => updateColumn(i, { required: e.target.checked })}
              />
              Required
            </label>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeColumn(i)}>
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
