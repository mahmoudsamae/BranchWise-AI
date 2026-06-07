import { z } from "zod";

export const OPS_COLUMN_TYPES = ["text", "number", "textarea", "select", "boolean", "date", "staff"] as const;
export type OpsColumnType = (typeof OPS_COLUMN_TYPES)[number];

export const opsColumnSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(OPS_COLUMN_TYPES),
    label: z.string().min(1).max(200),
    required: z.boolean().optional().default(false),
    options: z.array(z.string().min(1).max(200)).max(50).optional(),
  })
  .superRefine((row, ctx) => {
    if (row.type === "select" && (!row.options || row.options.length < 1)) {
      ctx.addIssue({ code: "custom", message: "Select columns require options", path: ["options"] });
    }
  });

export const opsColumnsJsonSchema = z.array(opsColumnSchema).max(30);

export type OpsColumn = z.infer<typeof opsColumnSchema>;

export function parseOpsColumns(raw: unknown) {
  return opsColumnsJsonSchema.safeParse(raw);
}

/** Fields filled when creating a row (e.g. spot, guest, deposit — not return/completion). */
export function isOpsAddFormColumn(col: OpsColumn) {
  if (col.type === "boolean") return false;
  if (col.type === "staff" && !col.required) return false;
  return true;
}

/** Optional / completion fields editable inline in the table after the row exists. */
export function isOpsInlineEditableColumn(col: OpsColumn) {
  return !col.required;
}

export function validateOpsRowData(
  columns: OpsColumn[],
  data: Record<string, unknown>,
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  const cleaned: Record<string, unknown> = {};
  for (const col of columns) {
    const raw = data[col.id];
    if (raw === undefined || raw === null || raw === "") {
      if (col.required) return { ok: false, error: `"${col.label}" is required` };
      continue;
    }
    if (col.type === "boolean") {
      cleaned[col.id] = raw === true || raw === "true" || raw === 1 || raw === "1";
      continue;
    }
    if (col.type === "number") {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (Number.isNaN(n)) return { ok: false, error: `"${col.label}" must be a number` };
      cleaned[col.id] = n;
      continue;
    }
    if (col.type === "staff") {
      cleaned[col.id] = String(raw).trim();
      continue;
    }
    if (col.type === "select") {
      const s = String(raw).trim();
      if (!col.options?.includes(s)) return { ok: false, error: `"${col.label}" has invalid option` };
      cleaned[col.id] = s;
      continue;
    }
    cleaned[col.id] = String(raw).trim();
  }
  return { ok: true, data: cleaned };
}
