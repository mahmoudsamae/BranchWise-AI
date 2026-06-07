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
  FORM_FIELD_TYPES,
  type FormField,
  type FormFieldType,
} from "@/lib/company-forms/fields";
import type { CompanyFormModule } from "@/lib/company-forms/modules";

type SavedTemplate = {
  id: string;
  title: string;
  fields: FormField[] | null;
  is_active?: boolean | null;
};

const PALETTE: { type: FormFieldType; label: string }[] = [
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

function defaultLabel(type: FormFieldType): string {
  const map: Partial<Record<FormFieldType, string>> = {
    text: "Text",
    email: "Email",
    phone: "Phone",
    number: "Number",
    textarea: "Long text",
    select: "Dropdown",
    boolean: "Yes / No",
    date: "Date",
    file: "File upload",
  };
  return map[type] ?? "Field";
}

function makeNewField(type: FormFieldType): FormField {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `field-${Date.now()}`;
  const base: FormField = { id, type, label: defaultLabel(type), placeholder: "", required: false };
  if (type === "select") return { ...base, options: ["Option 1"] };
  return base;
}

function isFieldType(v: string): v is FormFieldType {
  return (FORM_FIELD_TYPES as readonly string[]).includes(v);
}

export function FormBuilder({ module }: { module: CompanyFormModule }) {
  const apiBase = `/api/hr/company-forms/${module}`;
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [previewData, setPreviewData] = useState<Record<string, unknown>>({});

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/templates`);
      const json = (await res.json()) as { templates?: SavedTemplate[]; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Failed to load");
      setTemplates(json.templates ?? []);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Failed", "error");
    } finally {
      setLoading(false);
    }
  }, [apiBase, showToast]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  function resetEditor() {
    setEditingId(null);
    setTemplateTitle("");
    setFields([]);
    setPreviewData({});
  }

  function handlePaletteDropAtIndex(e: DragEvent, dropIndex: number) {
    e.preventDefault();
    const type = e.dataTransfer.getData(PALETTE_MIME) || e.dataTransfer.getData("text/plain");
    if (!isFieldType(type)) return;
    const next = [...fields];
    next.splice(dropIndex, 0, makeNewField(type));
    setFields(next);
  }

  function handlePaletteDropAppend(e: DragEvent) {
    e.preventDefault();
    const type = e.dataTransfer.getData(PALETTE_MIME) || e.dataTransfer.getData("text/plain");
    if (!isFieldType(type)) return;
    setFields([...fields, makeNewField(type)]);
  }

  async function saveTemplate() {
    const title = templateTitle.trim();
    if (!title || fields.length === 0) {
      showToast("Title and at least one field required", "error");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `${apiBase}/templates/${editingId}` : `${apiBase}/templates`;
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, fields }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      showToast(editingId ? "Updated" : "Created", "success");
      resetEditor();
      await loadTemplates();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
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
          <div className="flex flex-wrap gap-2">
            <input
              value={templateTitle}
              onChange={(e) => setTemplateTitle(e.target.value)}
              placeholder="Template title"
              className="min-w-[240px] rounded-lg border border-[#1f2937] bg-[#111827] px-3 py-2 text-sm text-[#f9fafb] outline-none focus:border-[#6366f1]"
            />
            <Button type="button" variant="secondary" onClick={resetEditor}>
              <Plus className="size-4" /> New
            </Button>
          </div>
          <Button type="button" onClick={() => void saveTemplate()} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {editingId ? "Update" : "Create"}
          </Button>
        </div>
        <div
          className="min-h-[160px] rounded-xl border border-dashed border-[#374151] p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handlePaletteDropAppend}
        >
          {fields.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#6b7280]">Drag fields here</p>
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
            <h3 className="mb-3 text-sm font-semibold text-[#9ca3af]">Preview</h3>
            <div className="grid gap-4">
              {fields.map((f) => (
                <OnboardingFieldRenderer
                  key={f.id}
                  field={f}
                  value={previewData[f.id]}
                  onChange={(v) => setPreviewData((p) => ({ ...p, [f.id]: v }))}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div>
          <h3 className="mb-3 text-sm font-semibold text-[#9ca3af]">Saved templates</h3>
          {loading ? (
            <Loader2 className="size-4 animate-spin text-[#6b7280]" />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Fields</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.title}</TableCell>
                    <TableCell>{(t.fields ?? []).length}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingId(t.id);
                          setTemplateTitle(t.title);
                          setFields((t.fields ?? []) as FormField[]);
                        }}
                      >
                        Edit
                      </Button>
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
