import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { parseFormFieldsJson } from "@/lib/company-forms/fields";
import { validateFormSubmission } from "@/lib/company-forms/validate-submission";
import { createServiceRoleClient } from "@/lib/supabase";
import { asJson } from "@/lib/supabase-json";

export async function GET() {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const [templatesRes, submissionsRes] = await Promise.all([
      supabase
        .from("company_form_templates")
        .select("id, title, fields, settings, is_active")
        .eq("module", "shift_handover")
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("company_form_submissions")
        .select("id, status, submitted_at, shift_date, company_form_templates ( title )")
        .eq("module", "shift_handover")
        .eq("branch_id", auth.session.branch_id)
        .order("submitted_at", { ascending: false })
        .limit(50),
    ]);

    if (templatesRes.error) return NextResponse.json({ error: templatesRes.error.message }, { status: 500 });
    if (submissionsRes.error) return NextResponse.json({ error: submissionsRes.error.message }, { status: 500 });

    const submissions = (submissionsRes.data ?? []).map((row) => {
      const template = row.company_form_templates as { title: string } | null;
      return {
        id: row.id,
        status: row.status,
        submitted_at: row.submitted_at,
        shift_date: row.shift_date,
        template_title: template?.title ?? null,
      };
    });

    return NextResponse.json({ templates: templatesRes.data ?? [], submissions });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  let body: { template_id?: string; shift_date?: string; data?: Record<string, unknown> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const templateId = String(body.template_id ?? "").trim();
  const shiftDate = String(body.shift_date ?? new Date().toISOString().slice(0, 10)).trim();
  if (!templateId) return NextResponse.json({ error: "Template is required" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const { data: template, error: templateError } = await supabase
      .from("company_form_templates")
      .select("id, title, fields, is_active")
      .eq("id", templateId)
      .eq("module", "shift_handover")
      .maybeSingle();

    if (templateError) return NextResponse.json({ error: templateError.message }, { status: 500 });
    if (!template || !template.is_active) {
      return NextResponse.json({ error: "Handover template not found" }, { status: 404 });
    }

    const fieldsParsed = parseFormFieldsJson(template.fields);
    if (!fieldsParsed.success) {
      return NextResponse.json({ error: "Invalid template configuration" }, { status: 500 });
    }

    const validated = validateFormSubmission(fieldsParsed.data, body.data ?? {});
    if (!validated.ok) return NextResponse.json({ error: validated.error }, { status: 400 });

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("company_form_submissions")
      .insert({
        module: "shift_handover",
        template_id: templateId,
        branch_id: auth.session.branch_id,
        submitted_by_user_id: auth.session.id,
        shift_date: shiftDate,
        data: asJson(validated.data),
        status: "submitted",
        submitted_at: now,
      })
      .select("id, submitted_at, shift_date")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ submission: data });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
