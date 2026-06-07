import { NextResponse } from "next/server";

import { isErrorResponse, parseModuleParam } from "@/lib/company-forms/api-helpers";
import { parseFormFieldsJson } from "@/lib/company-forms/fields";
import { MODULE_CONFIG } from "@/lib/company-forms/modules";
import { requireHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";
import { asJson } from "@/lib/supabase-json";

type Params = { params: Promise<{ module: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const module = parseModuleParam((await params).module);
  if (isErrorResponse(module)) return module;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("company_form_templates")
      .select("id, module, title, fields, settings, is_active, created_at, updated_at")
      .eq("module", module)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ templates: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const module = parseModuleParam((await params).module);
  if (isErrorResponse(module)) return module;

  let body: { title?: string; fields?: unknown; settings?: unknown };
  try {
    body = (await request.json()) as { title?: string; fields?: unknown; settings?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const fieldsParsed = parseFormFieldsJson(body.fields ?? []);
  if (!fieldsParsed.success) {
    return NextResponse.json({ error: "Invalid fields", details: fieldsParsed.error.issues }, { status: 400 });
  }

  const settings =
    body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
      ? body.settings
      : { default_validity_days: MODULE_CONFIG[module].defaultValidityDays };

  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("company_form_templates")
      .insert({
        module,
        title,
        fields: fieldsParsed.data,
        settings: asJson(settings),
        created_by: auth.session.id,
        updated_at: now,
      })
      .select("id, module, title, fields, settings, is_active, created_at, updated_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ template: data });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
