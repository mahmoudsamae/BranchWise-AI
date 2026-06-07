import { NextResponse } from "next/server";

import { onboardingInviteUrl } from "@/lib/email/app-url";
import { requireHrApi } from "@/lib/gm-hr/require-session";
import { generateOnboardingToken, onboardingInviteExpiry } from "@/lib/onboarding/token";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  try {
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
        created_at,
        submitted_at,
        onboarding_templates ( title )
      `,
      )
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const invites = (data ?? []).map((row) => {
      const template = row.onboarding_templates as { title: string } | null;
      return {
        id: row.id,
        token: row.token,
        employee_name: row.employee_name,
        template_id: row.template_id,
        template_title: template?.title ?? null,
        status: row.status,
        expires_at: row.expires_at,
        created_at: row.created_at,
        submitted_at: row.submitted_at,
        link: onboardingInviteUrl(row.token, request),
      };
    });

    return NextResponse.json({ invites });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  let body: { employee_name?: string; template_id?: string; staff_member_id?: string };
  try {
    body = (await request.json()) as { employee_name?: string; template_id?: string; staff_member_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const employeeName = String(body.employee_name ?? "").trim();
  const templateId = String(body.template_id ?? "").trim();
  if (!employeeName) return NextResponse.json({ error: "Employee name is required" }, { status: 400 });
  if (!templateId) return NextResponse.json({ error: "Template is required" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const { data: template, error: templateError } = await supabase
      .from("onboarding_templates")
      .select("id, title, is_active")
      .eq("id", templateId)
      .maybeSingle();

    if (templateError) return NextResponse.json({ error: templateError.message }, { status: 500 });
    if (!template || !template.is_active) {
      return NextResponse.json({ error: "Template not found or inactive" }, { status: 404 });
    }

    const staffMemberId = String(body.staff_member_id ?? "").trim() || null;
    const token = generateOnboardingToken();
    const { data, error } = await supabase
      .from("onboarding_invites")
      .insert({
        token,
        employee_name: employeeName,
        template_id: templateId,
        staff_member_id: staffMemberId,
        created_by: auth.session.id,
        expires_at: onboardingInviteExpiry(14),
        status: "pending",
      })
      .select("id, token, employee_name, template_id, status, expires_at, created_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const link = onboardingInviteUrl(data.token, request);
    return NextResponse.json({
      invite: {
        ...data,
        template_title: template.title,
        link,
      },
    });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
