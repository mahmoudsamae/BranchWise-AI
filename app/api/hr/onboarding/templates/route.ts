import { NextResponse } from "next/server";

import { requireHrApi } from "@/lib/gm-hr/require-session";
import { parseOnboardingFieldsJson } from "@/lib/onboarding/template-fields";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET() {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("onboarding_templates")
      .select("id, title, fields, is_active, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ templates: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  let body: { title?: string; fields?: unknown };
  try {
    body = (await request.json()) as { title?: string; fields?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const fieldsParsed = parseOnboardingFieldsJson(body.fields ?? []);
  if (!fieldsParsed.success) {
    return NextResponse.json({ error: "Invalid fields", details: fieldsParsed.error.issues }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("onboarding_templates")
      .insert({
        title,
        fields: fieldsParsed.data,
        created_by: auth.session.id,
        updated_at: now,
      })
      .select("id, title, fields, is_active, created_at, updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ template: data });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
