import { z } from "zod";

export const ONBOARDING_FIELD_TYPES = [
  "text",
  "number",
  "textarea",
  "select",
  "boolean",
  "date",
  "email",
  "phone",
  "file",
] as const;

export type OnboardingFieldType = (typeof ONBOARDING_FIELD_TYPES)[number];

export const onboardingFieldSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(ONBOARDING_FIELD_TYPES),
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

export const onboardingFieldsJsonSchema = z.array(onboardingFieldSchema).max(200);

export type OnboardingField = z.infer<typeof onboardingFieldSchema>;

export type OnboardingFileValue = {
  path: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export function parseOnboardingFieldsJson(raw: unknown) {
  return onboardingFieldsJsonSchema.safeParse(raw);
}

export function isOnboardingFileValue(v: unknown): v is OnboardingFileValue {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.path === "string" &&
    typeof o.fileName === "string" &&
    typeof o.mimeType === "string" &&
    typeof o.size === "number"
  );
}
