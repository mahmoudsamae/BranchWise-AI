import {
  isOnboardingFileValue,
  type OnboardingField,
  type OnboardingFileValue,
} from "@/lib/onboarding/template-fields";

export type OnboardingSubmissionData = Record<string, unknown>;

export function validateOnboardingSubmission(
  fields: OnboardingField[],
  data: OnboardingSubmissionData,
): { ok: true; data: OnboardingSubmissionData } | { ok: false; error: string } {
  const cleaned: OnboardingSubmissionData = {};

  for (const field of fields) {
    const raw = data[field.id];

    if (field.type === "file") {
      if (!raw) {
        if (field.required) return { ok: false, error: `"${field.label}" is required` };
        continue;
      }
      if (!isOnboardingFileValue(raw)) {
        return { ok: false, error: `"${field.label}" must be a valid uploaded file` };
      }
      cleaned[field.id] = raw as OnboardingFileValue;
      continue;
    }

    if (raw === undefined || raw === null || raw === "") {
      if (field.required) return { ok: false, error: `"${field.label}" is required` };
      continue;
    }

    if (field.type === "boolean") {
      cleaned[field.id] = raw === true || raw === "true" || raw === 1 || raw === "1";
      continue;
    }

    if (field.type === "number") {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (Number.isNaN(n)) return { ok: false, error: `"${field.label}" must be a number` };
      cleaned[field.id] = n;
      continue;
    }

    if (field.type === "email") {
      const s = String(raw).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
        return { ok: false, error: `"${field.label}" must be a valid email` };
      }
      cleaned[field.id] = s;
      continue;
    }

    if (field.type === "select") {
      const s = String(raw).trim();
      if (!field.options?.includes(s)) {
        return { ok: false, error: `"${field.label}" has an invalid option` };
      }
      cleaned[field.id] = s;
      continue;
    }

    cleaned[field.id] = String(raw).trim();
  }

  return { ok: true, data: cleaned };
}
