import { NextResponse } from "next/server";

import { isErrorResponse, parseModuleParam } from "@/lib/company-forms/api-helpers";
import { companyFormInviteUrl } from "@/lib/company-forms/invite-url";
import { MODULE_CONFIG } from "@/lib/company-forms/modules";
import { formInviteExpiry, generateFormToken } from "@/lib/company-forms/token";
import { requireHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

type Params = { params: Promise<{ module: string }> };

export async function GET(request: Request, { params }: Params) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const module = parseModuleParam((await params).module);
  if (isErrorResponse(module)) return module;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("company_form_invites")
      .select(
        `
        id, token, subject_name, template_id, staff_member_id, status, expires_at, created_at, submitted_at,
        company_form_templates ( title )
      `,
      )
      .eq("module", module)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const invites = (data ?? []).map((row) => {
      const template = row.company_form_templates as { title: string } | null;
      return {
        id: row.id,
        token: row.token,
        subject_name: row.subject_name,
        template_id: row.template_id,
        template_title: template?.title ?? null,
        staff_member_id: row.staff_member_id,
        status: row.status,
        expires_at: row.expires_at,
        created_at: row.created_at,
        submitted_at: row.submitted_at,
        link: companyFormInviteUrl(module, row.token, request),
      };
    });

    return NextResponse.json({ invites });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const module = parseModuleParam((await params).module);
  if (isErrorResponse(module)) return module;

  const cfg = MODULE_CONFIG[module];
  if (!cfg.supportsInvites) {
    return NextResponse.json({ error: "This module does not support invite links" }, { status: 400 });
  }

  let body: { subject_name?: string; template_id?: string; staff_member_id?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subjectName = String(body.subject_name ?? "").trim();
  const templateId = String(body.template_id ?? "").trim();
  const staffMemberId = String(body.staff_member_id ?? "").trim() || null;

  if (!subjectName) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!templateId) return NextResponse.json({ error: "Template is required" }, { status: 400 });
  if (cfg.requiresStaffOnInvite && !staffMemberId) {
    return NextResponse.json({ error: "Staff member is required" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: template, error: templateError } = await supabase
      .from("company_form_templates")
      .select("id, title, is_active, module")
      .eq("id", templateId)
      .eq("module", module)
      .maybeSingle();

    if (templateError) return NextResponse.json({ error: templateError.message }, { status: 500 });
    if (!template || !template.is_active) {
      return NextResponse.json({ error: "Template not found or inactive" }, { status: 404 });
    }

    let branchId: string | null = null;
    if (staffMemberId) {
      const { data: staff } = await supabase.from("staff_members").select("branch_id").eq("id", staffMemberId).maybeSingle();
      branchId = staff?.branch_id ?? null;
    }

    const token = generateFormToken();
    const { data, error } = await supabase
      .from("company_form_invites")
      .insert({
        module,
        token,
        subject_name: subjectName,
        template_id: templateId,
        staff_member_id: staffMemberId,
        branch_id: branchId,
        created_by: auth.session.id,
        expires_at: formInviteExpiry(module === "policy" ? 30 : 14),
        status: "pending",
      })
      .select("id, token, subject_name, template_id, staff_member_id, status, expires_at, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      invite: {
        ...data,
        template_title: template.title,
        link: companyFormInviteUrl(module, data.token, request),
      },
    });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
