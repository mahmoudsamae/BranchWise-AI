import type { FormField } from "@/lib/company-forms/fields";
import type { CompanyFormModule } from "@/lib/company-forms/modules";
import { createServiceRoleClient } from "@/lib/supabase";

export type ResolvedCompanyFormInvite = {
  id: string;
  module: CompanyFormModule;
  token: string;
  subject_name: string;
  template_id: string;
  staff_member_id: string | null;
  branch_id: string | null;
  status: string;
  expires_at: string;
  template_title: string;
  fields: FormField[];
  settings: Record<string, unknown>;
};

export async function resolveCompanyFormInvite(
  module: CompanyFormModule,
  token: string,
): Promise<{ ok: true; invite: ResolvedCompanyFormInvite } | { ok: false; error: string; status: number }> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("company_form_invites")
    .select(
      `
      id, module, token, subject_name, template_id, staff_member_id, branch_id, status, expires_at,
      company_form_templates ( title, fields, settings, is_active, module )
    `,
    )
    .eq("token", token)
    .eq("module", module)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, status: 500 };
  if (!data) return { ok: false, error: "Link not found", status: 404 };

  const template = data.company_form_templates as {
    title: string;
    fields: unknown;
    settings: unknown;
    is_active: boolean;
    module: string;
  } | null;

  if (!template || !template.is_active || template.module !== module) {
    return { ok: false, error: "This form is no longer available", status: 410 };
  }

  const expiresAt = new Date(data.expires_at);
  if (expiresAt.getTime() < Date.now()) {
    if (data.status !== "submitted" && data.status !== "acknowledged") {
      await supabase.from("company_form_invites").update({ status: "expired" }).eq("id", data.id);
    }
    return { ok: false, error: "This link has expired", status: 410 };
  }

  if (data.status === "submitted" || data.status === "acknowledged") {
    return { ok: false, error: "This form has already been submitted", status: 409 };
  }

  return {
    ok: true,
    invite: {
      id: data.id,
      module: data.module as CompanyFormModule,
      token: data.token,
      subject_name: data.subject_name,
      template_id: data.template_id,
      staff_member_id: data.staff_member_id,
      branch_id: data.branch_id,
      status: data.status,
      expires_at: data.expires_at,
      template_title: template.title,
      fields: (template.fields ?? []) as FormField[],
      settings: (template.settings ?? {}) as Record<string, unknown>,
    },
  };
}

export async function resolveIncidentByBranchToken(
  token: string,
): Promise<
  | {
      ok: true;
      branch_id: string;
      branch_name: string;
      template_id: string;
      template_title: string;
      fields: FormField[];
      settings: Record<string, unknown>;
    }
  | { ok: false; error: string; status: number }
> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("branch_incident_tokens")
    .select(
      `
      branch_id, template_id, is_active,
      branches ( name ),
      company_form_templates ( id, title, fields, settings, is_active, module )
    `,
    )
    .eq("token", token)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, status: 500 };
  if (!data || !data.is_active) return { ok: false, error: "Incident reporting is not available", status: 404 };

  let template = data.company_form_templates as {
    id: string;
    title: string;
    fields: unknown;
    settings: unknown;
    is_active: boolean;
    module: string;
  } | null;

  if (!template || !template.is_active) {
    const { data: fallback } = await supabase
      .from("company_form_templates")
      .select("id, title, fields, settings, is_active, module")
      .eq("module", "incident")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    template = fallback;
  }

  if (!template) {
    return { ok: false, error: "No incident form template configured", status: 503 };
  }

  const branch = data.branches as { name: string } | null;
  return {
    ok: true,
    branch_id: data.branch_id,
    branch_name: branch?.name ?? "Branch",
    template_id: template.id,
    template_title: template.title,
    fields: (template.fields ?? []) as FormField[],
    settings: (template.settings ?? {}) as Record<string, unknown>,
  };
}
