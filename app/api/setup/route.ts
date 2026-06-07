/**
 * One-time dev seed for a known super admin + bcrypt hash.
 * Visit once at /api/setup in development, then remove this file from the repo.
 * Disabled in production.
 */
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY missing" }, { status: 503 });
  }

  const email = "superadmin@gmail.com".toLowerCase();
  const hash = bcrypt.hashSync("Superadmin123", 12);

  const { data: existing, error: findErr } = await supabase.from("users").select("id").ilike("email", email).maybeSingle();
  if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 });

  if (existing?.id) {
    const { error } = await supabase
      .from("users")
      .update({
        full_name: "Super Admin",
        password_hash: hash,
        role: "super_admin",
        is_active: true,
        branch_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, message: "Super admin password hash refreshed" });
  }

  const { error } = await supabase.from("users").insert({
    email,
    full_name: "Super Admin",
    password_hash: hash,
    role: "super_admin",
    is_active: true,
    branch_id: null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, message: "Super admin created with correct hash" });
}
