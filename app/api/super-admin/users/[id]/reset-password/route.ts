import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api/validate-body";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireSuperAdminApi } from "@/lib/super-admin/require-session";

const resetPasswordBodySchema = z.object({
  new_password: z.string().min(8, "Password must be at least 8 characters"),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(resetPasswordBodySchema, raw);
  if (!parsed.ok) return parsed.response;

  try {
    const supabase = createServiceRoleClient();
    const { data: user } = await supabase.from("users").select("id").eq("id", id).maybeSingle();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const password_hash = await bcrypt.hash(parsed.data.new_password, 12);
    const now = new Date().toISOString();

    const { error } = await supabase.from("users").update({ password_hash, updated_at: now }).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
