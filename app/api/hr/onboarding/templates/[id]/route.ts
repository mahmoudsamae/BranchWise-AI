import { NextResponse } from "next/server";

import { requireHrApi } from "@/lib/gm-hr/require-session";
import type { Database } from "@/lib/database.types";
import { parseOnboardingFieldsJson } from "@/lib/onboarding/template-fields";
import { createServiceRoleClient } from "@/lib/supabase";

type TemplateUpdate = Database["public"]["Tables"]["onboarding_templates"]["Update"];

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: { title?: string; fields?: unknown; is_active?: boolean };
  try {
    body = (await request.json()) as { title?: string; fields?: unknown; is_active?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: TemplateUpdate = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    patch.title = title;
  }
  if (body.fields !== undefined) {
    const fieldsParsed = parseOnboardingFieldsJson(body.fields);
    if (!fieldsParsed.success) {
      return NextResponse.json({ error: "Invalid fields", details: fieldsParsed.error.issues }, { status: 400 });
    }
    patch.fields = fieldsParsed.data;
  }
  if (body.is_active !== undefined) patch.is_active = Boolean(body.is_active);

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("onboarding_templates")
      .update(patch)
      .eq("id", id)
      .select("id, title, fields, is_active, created_at, updated_at")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    return NextResponse.json({ template: data });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const supabase = createServiceRoleClient();
    const { data: invites } = await supabase
      .from("onboarding_invites")
      .select("id")
      .eq("template_id", id)
      .limit(1);

    if (invites && invites.length > 0) {
      const { error } = await supabase
        .from("onboarding_templates")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ deactivated: true });
    }

    const { error } = await supabase.from("onboarding_templates").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ deleted: true });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
