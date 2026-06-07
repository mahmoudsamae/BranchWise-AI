"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import { TemplateFieldRenderer } from "@/components/reports/template-field-renderer";
import { cn } from "@/lib/cn";
import {
  FIELD_TYPES,
  type FieldType,
  type TemplateField,
  type TemplateType,
} from "@/lib/report-builder/template-fields";

import { PALETTE_MIME, PaletteDragItem } from "./template-field-row";
import { SortableFieldsCanvas } from "./sortable-fields-canvas";

type SavedTemplate = {
  id: string;
  title: string;
  type: string;
  fields: TemplateField[] | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

type BranchRow = { id: string; name: string; location: string | null };

type RequestRow = {
  id: string;
  title: string | null;
  status: string | null;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  branch_name: string | null;
  template_title: string | null;
  report_submitted_at: string | null;
};

function defaultLabel(type: FieldType): string {
  switch (type) {
    case "text":
      return "Text";
    case "number":
      return "Number";
    case "textarea":
      return "Long text";
    case "select":
      return "Dropdown";
    case "boolean":
      return "Yes / No";
    case "date":
      return "Date";
    default:
      return "Field";
  }
}

function makeNewField(type: FieldType): TemplateField {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `field-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const base: TemplateField = {
    id,
    type,
    label: defaultLabel(type),
    placeholder: "",
    required: false,
  };
  if (type === "select") return { ...base, options: ["Option 1"] };
  return base;
}

function isFieldType(v: string): v is FieldType {
  return (FIELD_TYPES as readonly string[]).includes(v);
}

const PALETTE: { type: FieldType; label: string }[] = [
  { type: "text", label: "Text input" },
  { type: "number", label: "Number input" },
  { type: "textarea", label: "Text area" },
  { type: "select", label: "Dropdown" },
  { type: "boolean", label: "Yes / No" },
  { type: "date", label: "Date picker" },
];

export default function ReportBuilderClient({
  workspaceTitle,
  allowedTemplateTypes,
  defaultTemplateType = "daily",
  embedded = false,
  initialTab = "templates",
  schedulesBasePath,
}: {
  workspaceTitle: string;
  allowedTemplateTypes: readonly TemplateType[];
  defaultTemplateType?: TemplateType;
  /** Hide page title and tab bar when nested under Reports hub */
  embedded?: boolean;
  initialTab?: "templates" | "send";
  schedulesBasePath?: "/dashboard" | "/hr";
}) {
  const { showToast } = useToast();
  const [tab, setTab] = useState<"templates" | "send">(initialTab);

  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateType, setTemplateType] = useState<TemplateType>(defaultTemplateType);
  const [fields, setFields] = useState<TemplateField[]>([]);

  const [sendTemplateId, setSendTemplateId] = useState("");
  const [allBranches, setAllBranches] = useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = useState<Set<string>>(new Set());
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dueDatetime, setDueDatetime] = useState("");

  const [previewFields, setPreviewFields] = useState<TemplateField[] | null>(null);

  const loadTemplates = useCallback(async () => {
    const res = await fetch("/api/templates");
    if (!res.ok) {
      showToast("Could not load templates", "error");
      return;
    }
    const json = (await res.json()) as { templates?: SavedTemplate[] };
    const list = json.templates ?? [];
    setTemplates(
      list.map((t) => ({
        ...t,
        fields: Array.isArray(t.fields) ? (t.fields as TemplateField[]) : [],
      })),
    );
  }, [showToast]);

  const loadBranches = useCallback(async () => {
    const res = await fetch("/api/branches");
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      console.error("[report-builder] load branches failed:", res.status, j.error ?? res.statusText);
      showToast(j.error ?? "Could not load branches", "error");
      return;
    }
    const json = (await res.json()) as { branches?: BranchRow[] };
    setBranches(json.branches ?? []);
  }, [showToast]);

  const loadRequests = useCallback(async () => {
    const res = await fetch("/api/report-requests");
    if (!res.ok) {
      showToast("Could not load report requests", "error");
      return;
    }
    const json = (await res.json()) as { requests?: RequestRow[] };
    setRequests(json.requests ?? []);
  }, [showToast]);

  useEffect(() => {
    void loadTemplates();
    void loadBranches();
    void loadRequests();
  }, [loadTemplates, loadBranches, loadRequests]);

  const activeTemplates = useMemo(
    () => templates.filter((t) => t.is_active !== false),
    [templates],
  );

  const typeOptions = useMemo((): TemplateType[] => {
    const allowed = new Set<TemplateType>(allowedTemplateTypes);
    if (allowed.has(templateType)) return [...allowed];
    return [...allowed];
  }, [allowedTemplateTypes, templateType]);

  const resetBuilder = () => {
    setEditingId(null);
    setTemplateTitle("");
    setTemplateType(defaultTemplateType);
    setFields([]);
  };

  const applyPaletteAtIndex = useCallback((e: DragEvent, dropIndex: number, checkType: (v: string) => v is FieldType) => {
    e.preventDefault();
    e.stopPropagation();
    const palette = e.dataTransfer.getData(PALETTE_MIME);
    if (!palette || !checkType(palette)) return;
    const nf = makeNewField(palette);
    setFields((prev) => [...prev.slice(0, dropIndex), nf, ...prev.slice(dropIndex)]);
  }, []);

  const applyPaletteAppend = useCallback((e: DragEvent, checkType: (v: string) => v is FieldType) => {
    e.preventDefault();
    const palette = e.dataTransfer.getData(PALETTE_MIME);
    if (!palette || !checkType(palette)) return;
    setFields((prev) => [...prev, makeNewField(palette)]);
  }, []);

  const saveTemplate = async () => {
    const title = templateTitle.trim();
    if (!title) {
      showToast("Template title is required", "error");
      return;
    }
    if (fields.length === 0) {
      showToast("Add at least one field", "error");
      return;
    }

    const payload = { title, type: templateType, fields };
    const res = editingId
      ? await fetch(`/api/templates/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(j.error ?? "Save failed", "error");
      return;
    }
    showToast(editingId ? "Template updated" : "Template saved", "success");
    await loadTemplates();
    resetBuilder();
  };

  const loadTemplateIntoBuilder = (t: SavedTemplate) => {
    setEditingId(t.id);
    setTemplateTitle(t.title);
    const tType = t.type as TemplateType;
    setTemplateType(allowedTemplateTypes.includes(tType) ? tType : defaultTemplateType);
    setFields(Array.isArray(t.fields) ? t.fields : []);
  };

  const duplicateTemplate = async (t: SavedTemplate) => {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Copy — ${t.title}`,
        type: t.type,
        fields: t.fields ?? [],
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(j.error ?? "Duplicate failed", "error");
      return;
    }
    showToast("Template duplicated", "success");
    await loadTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!window.confirm("Deactivate this template? It will be hidden from new requests.")) return;
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Delete failed", "error");
      return;
    }
    showToast("Template deactivated", "success");
    if (editingId === id) resetBuilder();
    await loadTemplates();
  };

  const sendRequests = async () => {
    if (!sendTemplateId) {
      showToast("Select a template", "error");
      return;
    }
    if (!allBranches && selectedBranchIds.size === 0) {
      showToast("Select at least one branch", "error");
      return;
    }
    if (!periodStart || !periodEnd) {
      showToast("Period start and end are required", "error");
      return;
    }
    if (!dueDatetime) {
      showToast("Due date is required", "error");
      return;
    }

    const dueDate = dueDatetime.length >= 10 ? dueDatetime.slice(0, 10) : dueDatetime;

    const res = await fetch("/api/report-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        template_id: sendTemplateId,
        ...(allBranches ? { all_branches: true } : { branch_ids: [...selectedBranchIds] }),
        period_start: periodStart,
        period_end: periodEnd,
        due_date: dueDate,
      }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(j.error ?? "Send failed", "error");
      return;
    }
    showToast("Report requests sent", "success");
    setSendTemplateId("");
    setAllBranches(false);
    setSelectedBranchIds(new Set());
    setPeriodStart("");
    setPeriodEnd("");
    setDueDatetime("");
    await loadRequests();
  };

  const toggleBranch = (id: string) => {
    setAllBranches(false);
    setSelectedBranchIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const recurringScheduleHref = useMemo(() => {
    if (!schedulesBasePath || !sendTemplateId) return null;
    const params = new URLSearchParams({ new: "1", template_id: sendTemplateId });
    if (allBranches) {
      params.set("all_branches", "true");
    } else if (selectedBranchIds.size > 0) {
      params.set("branch_ids", [...selectedBranchIds].join(","));
    }
    return `${schedulesBasePath}/schedules?${params.toString()}`;
  }, [schedulesBasePath, sendTemplateId, allBranches, selectedBranchIds]);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  return (
    <div className={cn("mx-auto max-w-[1400px] space-y-6", embedded && "max-w-none")}>
      {!embedded ? (
        <>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#a5b4fc]">{workspaceTitle}</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Report form builder</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#9ca3af]">
              Build dynamic report templates and send requests to one or more branches.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-[#1f2937] pb-4">
            <Button type="button" variant={tab === "templates" ? "primary" : "secondary"} onClick={() => setTab("templates")}>
              Templates
            </Button>
            <Button type="button" variant={tab === "send" ? "primary" : "secondary"} onClick={() => setTab("send")}>
              Send report request
            </Button>
          </div>
        </>
      ) : null}

      {tab === "templates" ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <h2 className="mb-3 text-sm font-semibold text-[#e5e7eb]">Field palette</h2>
            <div className="flex flex-col gap-2">
              {PALETTE.map((p) => (
                <PaletteDragItem key={p.type} type={p.type} label={p.label} />
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <h2 className="mb-3 text-sm font-semibold text-[#e5e7eb]">Form canvas</h2>
            <div
              className={cn(
                "min-h-[220px] rounded-xl border border-dashed border-[#1f2937] bg-[#0a0f1e]/50 p-4",
                fields.length === 0 && "flex flex-col",
              )}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (fields.length > 0) return;
                applyPaletteAppend(e, isFieldType);
              }}
            >
              {fields.length === 0 ? (
                <p className="mb-4 text-center text-sm text-[#6b7280]">Drag fields here to build your form</p>
              ) : null}
              {fields.length > 0 ? (
                <SortableFieldsCanvas
                  fields={fields}
                  onFieldsChange={setFields}
                  onPaletteDropAtIndex={applyPaletteAtIndex}
                  onPaletteDropAppend={applyPaletteAppend}
                  isFieldType={isFieldType}
                />
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-4">
            <h2 className="mb-3 text-sm font-semibold text-[#e5e7eb]">Template settings</h2>
            <div className="space-y-4 rounded-xl border border-[#1f2937] bg-[#111827] p-4">
              <div className="grid gap-1">
                <span className="text-xs font-medium text-[#9ca3af]">Template title *</span>
                <input
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1]"
                  placeholder="e.g. Weekly operations"
                />
              </div>
              <div className="grid gap-1">
                <span className="text-xs font-medium text-[#9ca3af]">Report type</span>
                <select
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value as TemplateType)}
                  className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1]"
                >
                  {typeOptions.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!fields.length) {
                      showToast("Add fields to preview", "error");
                      return;
                    }
                    setPreviewFields(fields);
                  }}
                  disabled={fields.length === 0}
                >
                  Preview Form
                </Button>
                <Button type="button" onClick={() => void saveTemplate()}>
                  {editingId ? "Update template" : "Save template"}
                </Button>
                {editingId ? (
                  <Button type="button" variant="ghost" onClick={resetBuilder}>
                    New template
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <section className="mt-10 lg:col-span-12">
            <h2 className="mb-3 text-lg font-semibold text-white">Saved templates</h2>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell as="th">Title</TableCell>
                  <TableCell as="th">Type</TableCell>
                  <TableCell as="th">Fields</TableCell>
                  <TableCell as="th">Status</TableCell>
                  <TableCell as="th">Created</TableCell>
                  <TableCell as="th">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>{t.type}</TableCell>
                    <TableCell>{Array.isArray(t.fields) ? t.fields.length : 0}</TableCell>
                    <TableCell>{t.is_active === false ? "Inactive" : "Active"}</TableCell>
                    <TableCell>{t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => loadTemplateIntoBuilder(t)}>
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={() => void duplicateTemplate(t)}>
                          Duplicate
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-2 py-1 text-xs text-[#fecaca]"
                          onClick={() => void deleteTemplate(t.id)}
                          disabled={t.is_active === false}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {templates.length === 0 ? <p className="mt-3 text-sm text-[#6b7280]">No templates yet.</p> : null}
          </section>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
            <h2 className="text-sm font-semibold text-[#a5b4fc]">Step 1 — Select template</h2>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="grid min-w-[220px] flex-1 gap-1">
                <span className="text-xs text-[#9ca3af]">Template</span>
                <select
                  value={sendTemplateId}
                  onChange={(e) => setSendTemplateId(e.target.value)}
                  className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb]"
                >
                  <option value="">Choose…</option>
                  {activeTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.type})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const t = activeTemplates.find((x) => x.id === sendTemplateId);
                  if (t?.fields && t.fields.length) setPreviewFields(t.fields);
                  else showToast("Select a template with fields", "error");
                }}
              >
                Preview Form
              </Button>
            </div>
          </section>

          <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
            <h2 className="text-sm font-semibold text-[#a5b4fc]">Step 2 — Recipients</h2>
            <label className="mt-3 flex items-center gap-2 text-sm text-[#e5e7eb]">
              <input
                type="checkbox"
                checked={allBranches}
                onChange={(e) => {
                  setAllBranches(e.target.checked);
                  if (e.target.checked) setSelectedBranchIds(new Set());
                }}
                className="size-4 rounded border-[#1f2937] text-[#6366f1]"
              />
              All branches
            </label>
            {!allBranches && branches.length === 0 ? (
              <p className="mt-4 text-sm text-[#9ca3af]">No branches loaded. Check your connection or try refreshing the page.</p>
            ) : null}
            {!allBranches && branches.length > 0 ? (
              <ul className="mt-4 grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                {branches.map((b) => (
                  <li key={b.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#1f2937] bg-[#0a0f1e]/60 px-3 py-2 text-sm hover:border-[#6366f1]/40">
                      <input
                        type="checkbox"
                        checked={selectedBranchIds.has(b.id)}
                        onChange={() => toggleBranch(b.id)}
                        className="mt-0.5 size-4 rounded border-[#1f2937] text-[#6366f1]"
                      />
                      <span>
                        <span className="font-medium text-[#f9fafb]">{b.name}</span>
                        {b.location ? <span className="mt-0.5 block text-xs text-[#9ca3af]">{b.location}</span> : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
            <h2 className="text-sm font-semibold text-[#a5b4fc]">Step 3 — Period & deadline</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1">
                <span className="text-xs text-[#9ca3af]">Period start</span>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb]"
                />
              </div>
              <div className="grid gap-1">
                <span className="text-xs text-[#9ca3af]">Period end</span>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb]"
                />
              </div>
              <div className="grid gap-1">
                <span className="text-xs text-[#9ca3af]">Due (date & time)</span>
                <input
                  type="datetime-local"
                  value={dueDatetime}
                  onChange={(e) => setDueDatetime(e.target.value)}
                  className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-[#f9fafb]"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-6">
            <h2 className="text-sm font-semibold text-[#a5b4fc]">Step 4 — Review & send</h2>
            <ul className="mt-3 space-y-1 text-sm text-[#d1d5db]">
              <li>
                Template:{" "}
                <strong className="text-white">{activeTemplates.find((t) => t.id === sendTemplateId)?.title ?? "—"}</strong>
              </li>
              <li>
                Branches:{" "}
                <strong className="text-white">
                  {allBranches ? "All branches" : `${selectedBranchIds.size} selected`}
                </strong>
              </li>
              <li>
                Period:{" "}
                <strong className="text-white">
                  {periodStart || "—"} → {periodEnd || "—"}
                </strong>
              </li>
              <li>
                Due: <strong className="text-white">{dueDatetime || "—"}</strong> (stored as date in database)
              </li>
            </ul>
            <Button type="button" className="mt-4" onClick={() => void sendRequests()}>
              Send request
            </Button>
            {schedulesBasePath ? (
              <p className="mt-3 text-sm text-[#9ca3af]">
                {recurringScheduleHref ? (
                  <Link href={recurringScheduleHref} className="font-medium text-[#a5b4fc] hover:text-[#c7d2fe]">
                    Set as recurring ↗
                  </Link>
                ) : (
                  <span>Select a template to set up a recurring schedule.</span>
                )}
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Sent requests</h2>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell as="th">Template</TableCell>
                  <TableCell as="th">Branch</TableCell>
                  <TableCell as="th">Period</TableCell>
                  <TableCell as="th">Due</TableCell>
                  <TableCell as="th">Status</TableCell>
                  <TableCell as="th">Submitted at</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.template_title ?? "—"}</TableCell>
                    <TableCell>{r.branch_name ?? "—"}</TableCell>
                    <TableCell>
                      {r.period_start ?? "—"} → {r.period_end ?? "—"}
                    </TableCell>
                    <TableCell>{r.due_date ?? "—"}</TableCell>
                    <TableCell>{r.status ?? "—"}</TableCell>
                    <TableCell>{r.report_submitted_at ? new Date(r.report_submitted_at).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {requests.length === 0 ? <p className="mt-3 text-sm text-[#6b7280]">No requests yet.</p> : null}
          </section>
        </div>
      )}

      <Modal
        open={previewFields !== null}
        title="Form preview"
        onClose={() => setPreviewFields(null)}
        footer={
          <Button type="button" variant="secondary" onClick={() => setPreviewFields(null)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
            This is a preview — how branch managers will see this form
          </div>
          <div className="max-h-[60vh] space-y-6 overflow-y-auto rounded-2xl border border-[#1f2937] bg-[#111827] p-6">
            {(previewFields ?? []).map((field) => (
              <TemplateFieldRenderer key={field.id} field={field} value={undefined} readOnly />
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
