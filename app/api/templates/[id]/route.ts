import { NextResponse } from "next/server";

import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { templateTypesForRole } from "@/lib/hr/role-scope";
import type { TablesUpdate } from "@/lib/database.types";
import { parseTemplateFieldsJson, templateTypeSchema } from "@/lib/report-builder/template-fields";
import { createServiceRoleClient } from "@/lib/supabase";
import { asJson } from "@/lib/supabase-json";
import type { AppRole } from "@/types/user";

async function templateAllowedForRole(
  supabase: ReturnType<typeof createServiceRoleClient>,
  id: string,
  role: AppRole,
): Promise<boolean> {
  const allowed = templateTypesForRole(role);
  if (!allowed) return false;
  const { data } = await supabase.from("templates").select("type").eq("id", id).maybeSingle();
  if (!data?.type) return false;
  return allowed.includes(data.type);
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: { title?: string; type?: string; fields?: unknown };
  try {
    body = (await request.json()) as { title?: string; type?: string; fields?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch: TablesUpdate<"templates"> = { updated_at: new Date().toISOString() };

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    patch.title = title;
  }

  if (body.type !== undefined) {
    const typeParsed = templateTypeSchema.safeParse(body.type);
    if (!typeParsed.success) return NextResponse.json({ error: "Invalid template type" }, { status: 400 });
    patch.type = typeParsed.data;
  }

  if (body.fields !== undefined) {
    const fieldsParsed = parseTemplateFieldsJson(body.fields);
    if (!fieldsParsed.success) {
      return NextResponse.json({ error: "Invalid fields", details: fieldsParsed.error.issues }, { status: 400 });
    }
    patch.fields = asJson(fieldsParsed.data);
  }

  if (Object.keys(patch).length <= 1) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const canAccess = await templateAllowedForRole(supabase, id, auth.session.role);
    if (!canAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("templates")
      .update(patch)
      .eq("id", id)
      .select("id, title, type, fields, created_at, updated_at")
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ template: data });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const canAccess = await templateAllowedForRole(supabase, id, auth.session.role);
    if (!canAccess) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("templates")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("is_active") || error.code === "42703") {
        const del = await supabase.from("templates").delete().eq("id", id);
        if (del.error) return NextResponse.json({ error: del.error.message }, { status: 400 });
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
