import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api/validate-body";
import { requireAnyAuthenticatedApi } from "@/lib/auth/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

const changePasswordBodySchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: Request) {
  const auth = await requireAnyAuthenticatedApi();
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(changePasswordBodySchema, raw);
  if (!parsed.ok) return parsed.response;

  const { current_password, new_password } = parsed.data;

  try {
    const supabase = createServiceRoleClient();
    const { data: user, error: loadErr } = await supabase
      .from("users")
      .select("id, password_hash, is_active")
      .eq("id", auth.session.id)
      .maybeSingle();

    if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.is_active === false) {
      return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
    }

    const hash = String(user.password_hash ?? "").trim();
    const passwordValid = hash.startsWith("$2") && (await bcrypt.compare(current_password, hash));
    if (!passwordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(new_password, 12);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("users")
      .update({ password_hash, updated_at: now })
      .eq("id", auth.session.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
