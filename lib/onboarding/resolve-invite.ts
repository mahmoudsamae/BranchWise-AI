import { createServiceRoleClient } from "@/lib/supabase";
import type { OnboardingField } from "@/lib/onboarding/template-fields";

export type ResolvedOnboardingInvite = {
  id: string;
  token: string;
  employee_name: string;
  template_id: string;
  status: string;
  expires_at: string;
  template_title: string;
  fields: OnboardingField[];
};

export async function resolveOnboardingInviteByToken(
  token: string,
): Promise<{ ok: true; invite: ResolvedOnboardingInvite } | { ok: false; error: string; status: number }> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("onboarding_invites")
    .select(
      `
      id,
      token,
      employee_name,
      template_id,
      status,
      expires_at,
      onboarding_templates ( title, fields, is_active )
    `,
    )
    .eq("token", token)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, status: 500 };
  if (!data) return { ok: false, error: "Link not found", status: 404 };

  const template = data.onboarding_templates as { title: string; fields: unknown; is_active: boolean } | null;
  if (!template || !template.is_active) {
    return { ok: false, error: "This form is no longer available", status: 410 };
  }

  const expiresAt = new Date(data.expires_at);
  if (expiresAt.getTime() < Date.now()) {
    if (data.status !== "submitted") {
      await supabase.from("onboarding_invites").update({ status: "expired" }).eq("id", data.id);
    }
    return { ok: false, error: "This link has expired", status: 410 };
  }

  if (data.status === "submitted") {
    return { ok: false, error: "This form has already been submitted", status: 409 };
  }

  return {
    ok: true,
    invite: {
      id: data.id,
      token: data.token,
      employee_name: data.employee_name,
      template_id: data.template_id,
      status: data.status,
      expires_at: data.expires_at,
      template_title: template.title,
      fields: (template.fields ?? []) as OnboardingField[],
    },
  };
}
