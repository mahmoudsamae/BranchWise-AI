import { NextResponse } from "next/server";

import { isErrorResponse, parseModuleParam } from "@/lib/company-forms/api-helpers";
import { isFormFileValue, type FormField } from "@/lib/company-forms/fields";
import { createFormSignedUrl } from "@/lib/company-forms/storage";
import { requireHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

type Params = { params: Promise<{ module: string; id: string }> };

async function enrichData(fields: FormField[], data: Record<string, unknown>) {
  const enriched: Record<string, unknown> = { ...data };
  for (const field of fields) {
    if (field.type !== "file") continue;
    const raw = data[field.id];
    if (!isFormFileValue(raw)) continue;
    const signedUrl = await createFormSignedUrl(raw.path);
    enriched[field.id] = { ...raw, signedUrl };
  }
  return enriched;
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const { module: moduleRaw, id } = await params;
  const module = parseModuleParam(moduleRaw);
  if (isErrorResponse(module)) return module;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("company_form_submissions")
      .select(
        `
        id, data, status, submitted_at, reviewed_at, shift_date, staff_member_id, branch_id,
        company_form_templates ( title, fields, settings ),
        company_form_invites ( subject_name, created_at, submitted_at ),
        staff_members ( full_name ),
        branches ( name )
      `,
      )
      .eq("id", id)
      .eq("module", module)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    const template = data.company_form_templates as { title: string; fields: unknown; settings: unknown } | null;
    const invite = data.company_form_invites as { subject_name: string; created_at: string; submitted_at: string | null } | null;
    const staff = data.staff_members as { full_name: string } | null;
    const branch = data.branches as { name: string } | null;
    const fields = (template?.fields ?? []) as FormField[];
    const enrichedData = await enrichData(fields, (data.data ?? {}) as Record<string, unknown>);

    return NextResponse.json({
      submission: {
        id: data.id,
        status: data.status,
        submitted_at: data.submitted_at,
        reviewed_at: data.reviewed_at,
        shift_date: data.shift_date,
        data: enrichedData,
        fields,
        subject_name: invite?.subject_name ?? staff?.full_name ?? null,
        template_title: template?.title ?? null,
        branch_name: branch?.name ?? null,
        staff_member_id: data.staff_member_id,
      },
    });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const { module: moduleRaw, id } = await params;
  const module = parseModuleParam(moduleRaw);
  if (isErrorResponse(module)) return module;

  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status !== "reviewed" && body.status !== "acknowledged") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("company_form_submissions")
      .update({
        status: body.status,
        reviewed_at: now,
        reviewed_by: auth.session.id,
      })
      .eq("id", id)
      .eq("module", module)
      .select("id, status, reviewed_at")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    return NextResponse.json({ submission: data });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
