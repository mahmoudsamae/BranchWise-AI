import { z } from "zod";

export const TEMPLATE_TYPES = ["daily", "weekly", "surprise", "hr", "standard"] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export const TEMPLATE_TYPES_UI = ["daily", "weekly", "surprise", "hr"] as const;

export const FIELD_TYPES = ["text", "number", "textarea", "select", "boolean", "date"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const templateFieldSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(FIELD_TYPES),
    label: z.string().min(1).max(500),
    placeholder: z.string().max(500).optional().default(""),
    required: z.boolean().optional().default(false),
    options: z.array(z.string().min(1).max(200)).max(50).optional(),
  })
  .superRefine((row, ctx) => {
    if (row.type === "select" && (!row.options || row.options.length < 1)) {
      ctx.addIssue({ code: "custom", message: "Select fields require at least one option", path: ["options"] });
    }
  });

export const templateFieldsJsonSchema = z.array(templateFieldSchema).max(200);

export const templateTypeSchema = z.enum(TEMPLATE_TYPES);

export type TemplateField = z.infer<typeof templateFieldSchema>;

export function parseTemplateFieldsJson(raw: unknown) {
  return templateFieldsJsonSchema.safeParse(raw);
}
