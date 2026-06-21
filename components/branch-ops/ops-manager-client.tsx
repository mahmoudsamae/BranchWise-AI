"use client";

import { Check, Copy, ExternalLink, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { OpsColumnEditor } from "@/components/branch-ops/ops-column-editor";
import { OpsDailyItemsEditor, itemsToGroupDrafts, mergeGroupDrafts } from "@/components/branch-ops/ops-daily-items-editor";
import { OpsDailyTaskList, type OpsDailyTaskItem } from "@/components/branch-ops/ops-daily-task-list";
import { OpsDateNav } from "@/components/branch-ops/ops-date-nav";
import { formatWorkDate } from "@/lib/branch-ops/dates";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { OpsColumn } from "@/lib/branch-ops/columns";
import { sanitizeOpsColumns, validateOpsColumnsForSave } from "@/lib/branch-ops/columns";
import { OPS_TABLE_PRESETS } from "@/lib/branch-ops/presets";

type DailyItem = { id?: string; label: string; time_hint?: string | null; time_group?: string };
type OpsTable = {
  id: string;
  name: string;
  table_type: "log" | "daily";
  columns: OpsColumn[];
  sort_order: number;
  is_active: boolean;
  daily_items?: DailyItem[];
};

type ReviewTable = OpsTable & {
  rows?: { id: string; data: Record<string, unknown>; staff_name: string | null; created_at: string }[];
  items?: {
    id: string;
    label: string;
    time_hint: string | null;
    time_group: "morning" | "midday" | "evening";
    completed: boolean;
    staff_name: string | null;
    completed_at: string | null;
  }[];
};

type EditForm = {
  tableId: string;
  tableType: "log" | "daily";
  name: string;
  columns: OpsColumn[];
  morningText: string;
  middayText: string;
  eveningText: string;
  existingDrafts: { id?: string; label: string; time_group: "morning" | "midday" | "evening" }[];
};

export function OpsManagerClient() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [opsToken, setOpsToken] = useState("");
  const [opsLink, setOpsLink] = useState("");
  const [tables, setTables] = useState<OpsTable[]>([]);
  const [reviewDate, setReviewDate] = useState(new Date().toISOString().slice(0, 10));
  const [review, setReview] = useState<ReviewTable[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState<"log" | "daily">("log");
  const [customMorningText, setCustomMorningText] = useState("");
  const [customMiddayText, setCustomMiddayText] = useState("");
  const [customEveningText, setCustomEveningText] = useState("");
  const [customColumns, setCustomColumns] = useState<OpsColumn[]>([]);
  const [creating, setCreating] = useState(false);

  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/branch/ops");
      const json = (await res.json()) as { ops_link?: string; token?: string; tables?: OpsTable[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setOpsToken(json.token ?? "");
      setTables((json.tables ?? []).map((t) => ({ ...t, columns: (t.columns ?? []) as OpsColumn[] })));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadReview = useCallback(async () => {
    setReviewLoading(true);
    try {
      const res = await fetch(`/api/branch/ops/review?date=${reviewDate}`);
      const json = (await res.json()) as { tables?: ReviewTable[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setReview((json.tables ?? []).map((t) => ({ ...t, columns: (t.columns ?? []) as OpsColumn[] })));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setReviewLoading(false);
    }
  }, [reviewDate, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!opsToken) {
      setOpsLink("");
      return;
    }
    setOpsLink(`${window.location.origin}/ops/${opsToken}`);
  }, [opsToken]);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  async function copyLink() {
    if (!opsLink) return;
    await navigator.clipboard.writeText(opsLink);
    setCopied(true);
    showToast("Ops link copied", "success");
    setTimeout(() => setCopied(false), 2000);
  }

  async function addPreset(presetIndex: number) {
    const preset = OPS_TABLE_PRESETS[presetIndex];
    if (!preset) return;
    setCreating(true);
    try {
      const res = await fetch("/api/branch/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: preset.name,
          table_type: preset.table_type,
          columns: preset.columns,
          daily_items: preset.daily_items,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      showToast(`"${preset.name}" added`, "success");
      await load();
      await loadReview();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setCreating(false);
    }
  }

  async function addCustom() {
    if (!customName.trim()) {
      showToast("Table name is required", "error");
      return;
    }
    if (customType === "log") {
      const columns = sanitizeOpsColumns(customColumns);
      const columnError = validateOpsColumnsForSave(columns);
      if (columns.length === 0) {
        showToast("Add at least one column", "error");
        return;
      }
      if (columnError) {
        showToast(columnError, "error");
        return;
      }
    }
    setCreating(true);
    try {
      const dailyItems =
        customType === "daily"
          ? mergeGroupDrafts(customMorningText, customMiddayText, customEveningText).map((i) => ({
              label: i.label,
              time_group: i.time_group,
            }))
          : undefined;
      const res = await fetch("/api/branch/ops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customName.trim(),
          table_type: customType,
          columns: customType === "log" ? sanitizeOpsColumns(customColumns) : [],
          daily_items: dailyItems,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      showToast("Table created", "success");
      setCustomName("");
      setCustomMorningText("");
      setCustomMiddayText("");
      setCustomEveningText("");
      setCustomColumns([]);
      await load();
      await loadReview();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setCreating(false);
    }
  }

  async function deactivateTable(id: string) {
    if (!confirm("Deactivate this table? Staff will no longer see it.")) return;
    const res = await fetch(`/api/branch/ops/tables/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      showToast(json.error ?? "Failed", "error");
      return;
    }
    showToast("Table deactivated", "success");
    if (editForm?.tableId === id) setEditForm(null);
    await load();
    await loadReview();
  }

  function startEdit(table: OpsTable) {
    const grouped = itemsToGroupDrafts(
      (table.daily_items ?? []).map((i) => ({
        id: i.id ?? "",
        label: i.label,
        time_group: i.time_group,
      })),
    );
    setEditForm({
      tableId: table.id,
      tableType: table.table_type,
      name: table.name,
      columns: [...(table.columns ?? [])],
      morningText: grouped.morning,
      middayText: grouped.midday,
      eveningText: grouped.evening,
      existingDrafts: grouped.drafts,
    });
  }

  async function saveEdit() {
    if (!editForm) return;
    if (!editForm.name.trim()) {
      showToast("Table name is required", "error");
      return;
    }
    if (editForm.tableType === "log" && editForm.columns.length === 0) {
      showToast("Add at least one column", "error");
      return;
    }
    const columns = sanitizeOpsColumns(editForm.columns);
    const columnError = editForm.tableType === "log" ? validateOpsColumnsForSave(columns) : null;
    if (columnError) {
      showToast(columnError, "error");
      return;
    }

    setSavingEdit(true);
    try {
      const body: Record<string, unknown> = { name: editForm.name.trim() };
      if (editForm.tableType === "log") {
        body.columns = columns;
      } else {
        body.daily_items = mergeGroupDrafts(
          editForm.morningText,
          editForm.middayText,
          editForm.eveningText,
          editForm.existingDrafts,
        ).map((item) => ({
          id: item.id,
          label: item.label,
          time_group: item.time_group,
        }));
      }

      const res = await fetch(`/api/branch/ops/tables/${editForm.tableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed");
      showToast("Table updated", "success");
      setEditForm(null);
      await load();
      await loadReview();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setSavingEdit(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[#9ca3af]">
        <Loader2 className="size-5 animate-spin" /> Loading…
      </div>
    );
  }

  const activeTables = tables.filter((t) => t.is_active);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold text-white">Branch Ops</h1>
        <p className="mt-2 max-w-2xl text-sm text-[#9ca3af]">
          Create operational tables for your branch. Staff open one permanent link on the iPad — each table appears as a tab.
        </p>
      </header>

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-5">
        <h2 className="text-sm font-semibold text-white">Staff link (permanent)</h2>
        <p className="mt-1 text-xs text-[#6b7280]">Bookmark this on branch iPads. No login required.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {opsLink ? (
            <>
              <code className="flex-1 truncate rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#a5b4fc]">{opsLink}</code>
              <Button type="button" variant="secondary" size="sm" onClick={() => void copyLink()}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                Copy
              </Button>
              <Link href={opsLink} target="_blank">
                <Button type="button" variant="outline" size="sm">
                  <ExternalLink className="size-4" /> Open
                </Button>
              </Link>
            </>
          ) : (
            <p className="text-sm text-amber-400">Link unavailable — check database connection.</p>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Quick presets</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {OPS_TABLE_PRESETS.map((preset, i) => (
            <button
              key={preset.name}
              type="button"
              disabled={creating}
              onClick={() => void addPreset(i)}
              className="rounded-xl border border-[#1f2937] bg-[#111827] p-4 text-left transition hover:border-[#6366f1]/50 disabled:opacity-50"
            >
              <p className="font-medium text-white">{preset.name}</p>
              <p className="mt-1 text-xs text-[#6b7280]">{preset.table_type === "daily" ? "Daily checklist" : "Log table"}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Custom table</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs text-[#9ca3af]">Name</label>
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
              placeholder="e.g. Lost & Found"
            />
          </div>
          <div>
            <label className="text-xs text-[#9ca3af]">Type</label>
            <select
              value={customType}
              onChange={(e) => setCustomType(e.target.value as "log" | "daily")}
              className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
            >
              <option value="log">Log (rows per day)</option>
              <option value="daily">Daily checklist</option>
            </select>
          </div>
        </div>

        {customType === "daily" ? (
          <OpsDailyItemsEditor
            morning={customMorningText}
            midday={customMiddayText}
            evening={customEveningText}
            onMorningChange={setCustomMorningText}
            onMiddayChange={setCustomMiddayText}
            onEveningChange={setCustomEveningText}
          />
        ) : (
          <OpsColumnEditor columns={customColumns} onChange={setCustomColumns} />
        )}

        <Button type="button" onClick={() => void addCustom()} disabled={creating}>
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Create table
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Your tables ({activeTables.length} active)</h2>
        {activeTables.length === 0 ? (
          <p className="text-sm text-[#6b7280]">No tables yet. Add a preset or create a custom table.</p>
        ) : (
          <div className="space-y-3">
            {activeTables.map((table) => (
              <div key={table.id} className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-white">{table.name}</p>
                    <p className="text-xs text-[#6b7280]">
                      {table.table_type === "daily" ? "Daily checklist" : `${table.columns.length} columns`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => startEdit(table)}
                    >
                      <Pencil className="size-4" /> Edit
                    </Button>
                    <Button type="button" variant="danger" size="sm" onClick={() => void deactivateTable(table.id)}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                {editForm?.tableId === table.id ? (
                  <div className="mt-4 space-y-4 rounded-lg border border-[#6366f1]/30 bg-[#0a0f1e]/50 p-4">
                    <div>
                      <label className="text-xs text-[#9ca3af]">Table name</label>
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => f && { ...f, name: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white"
                      />
                    </div>

                    {editForm.tableType === "daily" ? (
                      <OpsDailyItemsEditor
                        morning={editForm.morningText}
                        midday={editForm.middayText}
                        evening={editForm.eveningText}
                        onMorningChange={(v) => setEditForm((f) => f && { ...f, morningText: v })}
                        onMiddayChange={(v) => setEditForm((f) => f && { ...f, middayText: v })}
                        onEveningChange={(v) => setEditForm((f) => f && { ...f, eveningText: v })}
                      />
                    ) : (
                      <OpsColumnEditor
                        columns={editForm.columns}
                        onChange={(columns) => setEditForm((f) => f && { ...f, columns })}
                      />
                    )}

                    <div className="flex gap-2">
                      <Button type="button" size="sm" onClick={() => void saveEdit()} disabled={savingEdit}>
                        {savingEdit ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        Save changes
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditForm(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Day review</h2>
          <p className="text-xs text-[#6b7280]">
            Jeder Tag wird automatisch gespeichert. Wähle ein Datum — auch vergangene Tage bleiben erhalten.
          </p>
          <p className="text-sm font-medium text-[#a5b4fc]">{formatWorkDate(reviewDate)}</p>
          <OpsDateNav date={reviewDate} onChange={setReviewDate} />
        </div>
        {reviewLoading ? (
          <Loader2 className="size-5 animate-spin text-[#9ca3af]" />
        ) : review.length === 0 ? (
          <p className="text-sm text-[#6b7280]">No active tables to review.</p>
        ) : (
          <div className="space-y-6">
            {review.map((table) => (
              <div key={table.id} className="rounded-xl border border-[#1f2937] p-4">
                <h3 className="font-medium text-white">{table.name}</h3>
                {table.table_type === "daily" ? (
                  <div className="mt-3">
                    <OpsDailyTaskList
                      items={(table.items ?? []) as OpsDailyTaskItem[]}
                      readOnly
                    />
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-[#9ca3af]">{(table.rows ?? []).length} entries on {reviewDate}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
