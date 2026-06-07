import type { FormField, FormFileValue } from "@/lib/company-forms/fields";
import { isFormFileValue } from "@/lib/company-forms/fields";
import { MODULE_CONFIG, type CompanyFormModule } from "@/lib/company-forms/modules";
import { createServiceRoleClient } from "@/lib/supabase";

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function findExpiryDate(fields: FormField[], data: Record<string, unknown>): string | null {
  for (const field of fields) {
    if (field.type === "date" && (field.id === "expiry_date" || field.label.toLowerCase().includes("expir"))) {
      const v = data[field.id];
      if (typeof v === "string" && v) return v;
    }
  }
  return null;
}

function findPrimaryFile(fields: FormField[], data: Record<string, unknown>): FormFileValue | null {
  for (const field of fields) {
    if (field.type === "file") {
      const v = data[field.id];
      if (isFormFileValue(v)) return v;
    }
  }
  return null;
}

export async function trackDocumentFromSubmission(opts: {
  module: CompanyFormModule;
  submissionId: string;
  staffMemberId: string | null;
  templateTitle: string;
  fields: FormField[];
  data: Record<string, unknown>;
  settings: Record<string, unknown>;
  submittedAt: string;
}) {
  if (opts.module !== "document_renewal" || !opts.staffMemberId) return;

  const file = findPrimaryFile(opts.fields, opts.data);
  const explicitExpiry = findExpiryDate(opts.fields, opts.data);
  const validityDays =
    typeof opts.settings.default_validity_days === "number"
      ? opts.settings.default_validity_days
      : MODULE_CONFIG.document_renewal.defaultValidityDays;
  const expiresAt = explicitExpiry ?? (validityDays > 0 ? addDays(opts.submittedAt, validityDays) : null);

  const supabase = createServiceRoleClient();
  await supabase.from("staff_documents").insert({
    staff_member_id: opts.staffMemberId,
    label: opts.templateTitle,
    document_type: "renewal",
    expires_at: expiresAt,
    file_path: file?.path ?? null,
    file_name: file?.fileName ?? null,
    mime_type: file?.mimeType ?? null,
    file_size: file?.size ?? null,
    submission_id: opts.submissionId,
    updated_at: new Date().toISOString(),
  });
}
