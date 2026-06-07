import { NextResponse } from "next/server";

import { companyFormInviteUrl } from "@/lib/company-forms/invite-url";
import { formInviteExpiry, generateFormToken } from "@/lib/company-forms/token";
import { requireHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  let body: { template_id?: string; staff_ids?: string[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const templateId = String(body.template_id ?? "").trim();
  const staffIds = Array.isArray(body.staff_ids) ? body.staff_ids.filter((id) => typeof id === "string" && id) : [];
  if (!templateId) return NextResponse.json({ error: "Template is required" }, { status: 400 });
  if (staffIds.length === 0) return NextResponse.json({ error: "Select at least one staff member" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const { data: template, error: templateError } = await supabase
      .from("company_form_templates")
      .select("id, title, is_active")
      .eq("id", templateId)
      .eq("module", "policy")
      .maybeSingle();

    if (templateError) return NextResponse.json({ error: templateError.message }, { status: 500 });
    if (!template || !template.is_active) {
      return NextResponse.json({ error: "Policy template not found" }, { status: 404 });
    }

    const { data: staffRows, error: staffError } = await supabase
      .from("staff_members")
      .select("id, full_name, branch_id, is_active")
      .in("id", staffIds)
      .eq("is_active", true);

    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 });
    if (!staffRows?.length) return NextResponse.json({ error: "No active staff found" }, { status: 404 });

    const expiresAt = formInviteExpiry(30);
    const rows = staffRows.map((s) => ({
      module: "policy" as const,
      token: generateFormToken(),
      subject_name: s.full_name,
      template_id: templateId,
      staff_member_id: s.id,
      branch_id: s.branch_id,
      created_by: auth.session.id,
      expires_at: expiresAt,
      status: "pending" as const,
    }));

    const { data: created, error: insertError } = await supabase
      .from("company_form_invites")
      .insert(rows)
      .select("id, token, subject_name, staff_member_id");

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

    const invites = (created ?? []).map((inv) => ({
      ...inv,
      link: companyFormInviteUrl("policy", inv.token, request),
    }));

    return NextResponse.json({ created: invites.length, invites, template_title: template.title });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
