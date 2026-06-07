"use client";

import { useCallback, useEffect, useState, type DragEvent } from "react";
import { Loader2, Plus, Save } from "lucide-react";

import { OnboardingFieldRenderer } from "@/components/onboarding/onboarding-field-renderer";
import { OnboardingPaletteDragItem, PALETTE_MIME } from "@/components/onboarding/onboarding-field-row";
import { SortableOnboardingFields } from "@/components/onboarding/sortable-onboarding-fields";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import {
  ONBOARDING_FIELD_TYPES,
  type OnboardingField,
  type OnboardingFieldType,
} from "@/lib/onboarding/template-fields";

type SavedTemplate = {
  id: string;
  title: string;
  fields: OnboardingField[] | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

function defaultLabel(type: OnboardingFieldType): string {
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
    case "email":
      return "Email";
    case "phone":
      return "Phone";
    case "file":
      return "File upload";
    default:
      return "Field";
  }
}

function makeNewField(type: OnboardingFieldType): OnboardingField {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `field-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const base: OnboardingField = { id, type, label: defaultLabel(type), placeholder: "", required: false };
  if (type === "select") return { ...base, options: ["Option 1"] };
  return base;
}

function isFieldType(v: string): v is OnboardingFieldType {
  return (ONBOARDING_FIELD_TYPES as readonly string[]).includes(v);
}

const PALETTE: { type: OnboardingFieldType; label: string }[] = [
  { type: "text", label: "Text" },
  { type: "email", label: "Email" },
  { type: "phone", label: "Phone" },
  { type: "number", label: "Number" },
  { type: "textarea", label: "Long text" },
  { type: "select", label: "Dropdown" },
  { type: "boolean", label: "Yes / No" },
  { type: "date", label: "Date" },
  { type: "file", label: "File upload" },
];

export function OnboardingBuilder() {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [fields, setFields] = useState<OnboardingField[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/onboarding/templates");
      const json = (await res.json()) as { templates?: SavedTemplate[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load templates");
      setTemplates(json.templates ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed to load templates", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  function resetEditor() {
    setEditingId(null);
    setTemplateTitle("");
    setFields([]);
    setPreviewData({});
  }

  function startEdit(t: SavedTemplate) {
    setEditingId(t.id);
    setTemplateTitle(t.title);
    setFields((t.fields ?? []) as OnboardingField[]);
    setPreviewData({});
  }

  function handlePaletteDropAtIndex(e: DragEvent, dropIndex: number, check: (v: string) => v is OnboardingFieldType) {
    e.preventDefault();
    const type = e.dataTransfer.getData(PALETTE_MIME) || e.dataTransfer.getData("text/plain");
    if (!check(type)) return;
    const next = [...fields];
    next.splice(dropIndex, 0, makeNewField(type));
    setFields(next);
  }

  function handlePaletteDropAppend(e: DragEvent, check: (v: string) => v is OnboardingFieldType) {
    e.preventDefault();
    const type = e.dataTransfer.getData(PALETTE_MIME) || e.dataTransfer.getData("text/plain");
    if (!check(type)) return;
    setFields([...fields, makeNewField(type)]);
  }

  async function saveTemplate() {
    const title = templateTitle.trim();
    if (!title) {
      showToast("Template title is required", "error");
      return;
    }
    if (fields.length === 0) {
      showToast("Add at least one field", "error");
      return;
    }

    setSaving(true);
    try {
      const url = editingId ? `/api/hr/onboarding/templates/${editingId}` : "/api/hr/onboarding/templates";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, fields }),
      });
      const json = (await res.json()) as { template?: SavedTemplate; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      showToast(editingId ? "Template updated" : "Template created", "success");
      resetEditor();
      await loadTemplates();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function deactivateTemplate(id: string) {
    if (!confirm("Deactivate this template? Existing links will stop working for new invites.")) return;
    try {
      const res = await fetch(`/api/hr/onboarding/templates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Failed");
      }
      showToast("Template deactivated", "success");
      if (editingId === id) resetEditor();
      await loadTemplates();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-3">
        <h3 className="text-sm font-semibold text-[#9ca3af]">Field palette</h3>
        <div className="flex flex-col gap-2">
          {PALETTE.map((p) => (
            <OnboardingPaletteDragItem key={p.type} type={p.type} label={p.label} />
          ))}
        </div>
      </aside>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              placeholder="Template title (e.g. New hire documents)"
              className="min-w-[240px] rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1]"
            />
            <Button type="button" variant="secondary" onClick={resetEditor}>
              <Plus className="size-4" />
              New
            </Button>
          </div>
          <Button type="button" onClick={() => void saveTemplate()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {editingId ? "Update template" : "Create template"}
          </Button>
        </div>

        <div
          className="min-h-[200px] rounded-xl border border-dashed border-[#374151] bg-[#0a0f1e]/40 p-4"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => handlePaletteDropAppend(e, isFieldType)}
        >
          {fields.length === 0 ? (
            <p className="py-8 text-center text-sm text-[#6b7280]">Drag fields here to build your onboarding form</p>
          ) : (
            <SortableOnboardingFields
              fields={fields}
              onFieldsChange={setFields}
              onPaletteDropAtIndex={handlePaletteDropAtIndex}
              onPaletteDropAppend={handlePaletteDropAppend}
              isFieldType={isFieldType}
            />
          )}
        </div>

        {fields.length > 0 ? (
          <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
            <h3 className="mb-4 text-sm font-semibold text-[#9ca3af]">Preview</h3>
            <div className="grid gap-4">
              {fields.map((f) => (
                <OnboardingFieldRenderer
                  key={f.id}
                  field={f}
                  value={previewData[f.id]}
                  onChange={(v) => setPreviewData((prev) => ({ ...prev, [f.id]: v }))}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#9ca3af]">Saved templates</h3>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[#6b7280]">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-[#6b7280]">No templates yet. Create your first one above.</p>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Fields</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>{(t.fields ?? []).length}</TableCell>
                    <TableCell>{t.is_active === false ? "Inactive" : "Active"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button type="button" variant="secondary" size="sm" onClick={() => startEdit(t)}>
                          Edit
                        </Button>
                        {t.is_active !== false ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => void deactivateTemplate(t.id)}>
                            Deactivate
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
