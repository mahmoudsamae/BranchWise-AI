import { NextResponse } from "next/server";

import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { GM_TEMPLATE_TYPES, templateTypesForRole } from "@/lib/hr/role-scope";
import { parseTemplateFieldsJson, templateTypeSchema } from "@/lib/report-builder/template-fields";
import { createServiceRoleClient } from "@/lib/supabase";

function applyTemplateTypeScope<T extends { eq: (col: string, val: string) => T; in: (col: string, vals: string[]) => T }>(
  query: T,
  role: string,
): T {
  if (role === "hr") return query.eq("type", "hr");
  if (role === "general_manager") return query.in("type", [...GM_TEMPLATE_TYPES]);
  return query;
}

export async function GET() {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    let firstQuery = supabase
      .from("templates")
      .select("id, title, type, fields, is_active, created_at, updated_at")
      .order("created_at", { ascending: false });
    firstQuery = applyTemplateTypeScope(firstQuery, auth.session.role);

    const first = await firstQuery;
    let data = first.data;
    let error = first.error;
    if (error && (error.message?.toLowerCase().includes("is_active") || error.code === "42703")) {
      let secondQuery = supabase
        .from("templates")
        .select("id, title, type, fields, created_at, updated_at")
        .order("created_at", { ascending: false });
      secondQuery = applyTemplateTypeScope(secondQuery, auth.session.role);
      const second = await secondQuery;
      data = second.data?.map((row) => ({ ...row, is_active: true })) ?? null;
      error = second.error;
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ templates: data ?? [] });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  let body: { title?: string; type?: string; fields?: unknown };
  try {
    body = (await request.json()) as { title?: string; type?: string; fields?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const typeParsed = templateTypeSchema.safeParse(body.type);
  if (!typeParsed.success) {
    return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
  }

  const allowedTypes = templateTypesForRole(auth.session.role);
  if (allowedTypes && !allowedTypes.includes(typeParsed.data)) {
    return NextResponse.json({ error: "Template type not allowed for your role" }, { status: 403 });
  }

  const fieldsParsed = parseTemplateFieldsJson(body.fields ?? []);
    if (!fieldsParsed.success) {
      return NextResponse.json({ error: "Invalid fields", details: fieldsParsed.error.issues }, { status: 400 });
    }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("templates")
      .insert({
        title,
        type: typeParsed.data,
        fields: fieldsParsed.data,
        updated_at: new Date().toISOString(),
      })
      .select("id, title, type, fields, created_at, updated_at")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ template: data });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
