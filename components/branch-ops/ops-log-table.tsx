"use client";

import { Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { OpsColumnField } from "@/components/branch-ops/ops-column-field";
import { Button } from "@/components/ui/Button";
import type { OpsColumn } from "@/lib/branch-ops/columns";
import { isOpsAddFormColumn, isOpsInlineEditableColumn } from "@/lib/branch-ops/columns";
import { filterOpenLogRows, findReturnColumn } from "@/lib/branch-ops/log-rows";

type StaffOption = { id: string; full_name: string };
type LogRow = { id: string; data: Record<string, unknown>; staff_name: string | null; created_at: string };

export function OpsLogTable({
  tableId,
  token,
  workDate,
  readOnly,
  columns,
  rows,
  staff,
  onRefresh,
}: {
  tableId: string;
  token: string;
  workDate: string;
  readOnly?: boolean;
  columns: OpsColumn[];
  rows: LogRow[];
  staff: StaffOption[];
  onRefresh: () => void;
}) {
  const [data, setData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patching, setPatching] = useState<string | null>(null);
  const staffMap = new Map(staff.map((s) => [s.id, s.full_name]));

  const addColumns = columns.filter(isOpsAddFormColumn);
  const returnCol = findReturnColumn(columns);
  const visibleRows = filterOpenLogRows(rows, columns);

  function displayValue(col: OpsColumn, raw: unknown) {
    if (col.type === "staff" && typeof raw === "string") return staffMap.get(raw) ?? raw;
    if (col.type === "boolean") return raw ? "Ja" : "Nein";
    return raw === undefined || raw === null || raw === "" ? "—" : String(raw);
  }

  async function addRow() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/ops/${token}/tables/${tableId}/rows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, work_date: workDate }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setData({});
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function patchCell(rowId: string, colId: string, value: unknown) {
    const key = `${rowId}:${colId}`;
    setPatching(key);
    try {
      const res = await fetch(`/api/ops/${token}/tables/${tableId}/rows`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row_id: rowId, data: { [colId]: value } }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      onRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPatching(null);
    }
  }

  function renderInlineCell(row: LogRow, col: OpsColumn) {
    const raw = row.data[col.id];
    const patchKey = `${row.id}:${col.id}`;
    const busy = patching === patchKey;

    if (col.type === "boolean") {
      const checked = raw === true || raw === "true" || raw === 1;
      return (
        <label className={`inline-flex items-center gap-2 ${busy ? "opacity-60" : ""}`}>
          <input
            type="checkbox"
            checked={checked}
            disabled={busy}
            onChange={(e) => void patchCell(row.id, col.id, e.target.checked)}
            className="size-4 rounded border-[#374151]"
          />
          <span className={checked ? "text-emerald-300" : "text-[#9ca3af]"}>
            {checked ? "Zurückgegeben" : "Noch offen"}
          </span>
          {busy ? <Loader2 className="size-3 animate-spin text-[#6b7280]" /> : null}
        </label>
      );
    }

    if (col.type === "staff") {
      const staffId = typeof raw === "string" ? raw : "";
      return (
        <div className="flex min-w-[140px] items-center gap-1">
          <select
            value={staffId}
            disabled={busy}
            onChange={(e) => void patchCell(row.id, col.id, e.target.value)}
            className="w-full rounded border border-[#374151] bg-[#0a0f1e] px-2 py-1 text-xs text-white"
          >
            <option value="">Mitarbeiter…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.full_name}</option>
            ))}
          </select>
          {busy ? <Loader2 className="size-3 shrink-0 animate-spin text-[#6b7280]" /> : null}
        </div>
      );
    }

    if (col.type === "number") {
      return (
        <input
          type="number"
          defaultValue={raw === undefined || raw === null || raw === "" ? "" : Number(raw)}
          disabled={busy}
          onBlur={(e) => {
            const v = e.target.value === "" ? "" : Number(e.target.value);
            if (v !== raw) void patchCell(row.id, col.id, v);
          }}
          className="w-20 rounded border border-[#374151] bg-[#0a0f1e] px-2 py-1 text-xs text-white"
        />
      );
    }

    if (col.type === "select" && col.options?.length) {
      return (
        <select
          value={typeof raw === "string" ? raw : ""}
          disabled={busy}
          onChange={(e) => void patchCell(row.id, col.id, e.target.value)}
          className="rounded border border-[#374151] bg-[#0a0f1e] px-2 py-1 text-xs text-white"
        >
          <option value="">—</option>
          {col.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        defaultValue={typeof raw === "string" ? raw : raw === undefined || raw === null ? "" : String(raw)}
        disabled={busy}
        onBlur={(e) => {
          if (e.target.value !== (raw ?? "")) void patchCell(row.id, col.id, e.target.value);
        }}
        className="min-w-[80px] rounded border border-[#374151] bg-[#0a0f1e] px-2 py-1 text-xs text-white"
      />
    );
  }

  return (
    <div className="space-y-6">
      {!readOnly ? (
      <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-white">Neuer Eintrag</h3>
        <p className="text-xs text-[#6b7280]">
          Ausleihe erfassen. Nach Rückgabe verschwindet der Eintrag aus der Liste (Archiv nach 24&nbsp;Std.).
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {addColumns.map((col) => (
            <OpsColumnField
              key={col.id}
              column={col}
              value={data[col.id]}
              staff={staff}
              onChange={(v) => setData((p) => ({ ...p, [col.id]: v }))}
            />
          ))}
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button type="button" onClick={() => void addRow()} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Eintrag hinzufügen
        </Button>
      </div>
      ) : (
        <p className="text-xs text-[#6b7280]">
          {visibleRows.length} offene Einträge
          {returnCol ? " (zurückgegebene ausgeblendet)" : ""}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#1f2937]">
        <table className="min-w-full text-sm">
          <thead className="bg-[#0a0f1e] text-left text-[#9ca3af]">
            <tr>
              {columns.map((col) => (
                <th key={col.id} className="px-3 py-2 font-medium whitespace-nowrap">{col.label}</th>
              ))}
              <th className="px-3 py-2 font-medium">Zeit</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-[#6b7280]">
                  Keine offenen Einträge
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr key={row.id} className="border-t border-[#1f2937] text-[#e5e7eb]">
                  {columns.map((col) => (
                    <td key={col.id} className="px-3 py-2 align-middle">
                      {!readOnly && isOpsInlineEditableColumn(col)
                        ? renderInlineCell(row, col)
                        : displayValue(col, row.data[col.id])}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-xs text-[#6b7280] whitespace-nowrap">
                    {new Date(row.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
