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
    onChange([...columns, { id: `col_${Date.now()}`, type: "text", label: "Neues Feld", required: false }]);
  }

  function updateColumn(index: number, patch: Partial<OpsColumn>) {
    onChange(columns.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeColumn(index: number) {
    onChange(columns.filter((_, i) => i !== index));
  }

  function changeType(index: number, type: OpsColumnType) {
    const col = columns[index];
    if (!col) return;
    const next: OpsColumn = { ...col, type };
    if (type === "select" && (!col.options || col.options.length === 0)) {
      next.options = [""];
    }
    if (type !== "select") {
      delete next.options;
    }
    updateColumn(index, next);
  }

  function updateOption(colIndex: number, optIndex: number, value: string) {
    const col = columns[colIndex];
    if (!col) return;
    const options = [...(col.options ?? [])];
    options[optIndex] = value;
    updateColumn(colIndex, { options });
  }

  function addOption(colIndex: number) {
    const col = columns[colIndex];
    if (!col) return;
    updateColumn(colIndex, { options: [...(col.options ?? []), ""] });
  }

  function removeOption(colIndex: number, optIndex: number) {
    const col = columns[colIndex];
    if (!col) return;
    const options = (col.options ?? []).filter((_, i) => i !== optIndex);
    updateColumn(colIndex, { options: options.length > 0 ? options : [""] });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#9ca3af]">Spalten</p>
        <Button type="button" variant="secondary" size="sm" onClick={addColumn}>
          <Plus className="size-4" /> Spalte hinzufügen
        </Button>
      </div>
      {columns.length === 0 ? (
        <p className="text-xs text-[#6b7280]">Noch keine Spalten. Mindestens ein Feld hinzufügen.</p>
      ) : (
        columns.map((col, i) => (
          <div key={col.id} className="space-y-3 rounded-lg border border-[#1f2937] p-3">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[120px] flex-1">
                <label className="text-xs text-[#6b7280]">Bezeichnung</label>
                <input
                  value={col.label}
                  onChange={(e) => updateColumn(i, { label: e.target.value })}
                  className="mt-1 w-full rounded border border-[#1f2937] bg-[#0a0f1e] px-2 py-1 text-sm text-white"
                />
              </div>
              <div>
                <label className="text-xs text-[#6b7280]">Typ</label>
                <select
                  value={col.type}
                  onChange={(e) => changeType(i, e.target.value as OpsColumnType)}
                  className="mt-1 rounded border border-[#1f2937] bg-[#0a0f1e] px-2 py-1 text-sm text-white"
                >
                  {OPS_COLUMN_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t === "select" ? "Auswahl (Select)" : t}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-1 text-xs text-[#9ca3af]">
                <input
                  type="checkbox"
                  checked={col.required ?? false}
                  onChange={(e) => updateColumn(i, { required: e.target.checked })}
                />
                Pflichtfeld
              </label>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeColumn(i)}>
                <Trash2 className="size-4" />
              </Button>
            </div>

            {col.type === "select" ? (
              <div className="rounded-lg border border-indigo-500/20 bg-indigo-950/20 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-indigo-200">Auswahloptionen</p>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => addOption(i)}>
                    <Plus className="size-3.5" /> Option
                  </Button>
                </div>
                <p className="mb-2 text-[10px] text-[#9ca3af]">
                  z. B. Kabel, Stift, Regenschirm — erscheinen als Dropdown beim Eintragen (Verleih &amp; Co.).
                </p>
                <ul className="space-y-2">
                  {(col.options ?? [""]).map((opt, oi) => (
                    <li key={`${col.id}-opt-${oi}`} className="flex items-center gap-2">
                      <input
                        value={opt}
                        onChange={(e) => updateOption(i, oi, e.target.value)}
                        placeholder="Option eingeben…"
                        className="min-w-0 flex-1 rounded border border-[#1f2937] bg-[#0a0f1e] px-2 py-1.5 text-sm text-white"
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(i, oi)}
                        className="rounded p-1 text-[#6b7280] hover:text-red-400"
                        aria-label="Option entfernen"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}
