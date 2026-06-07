import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api/validate-body";
import { createServiceRoleClient } from "@/lib/supabase";
import { requireSuperAdminApi } from "@/lib/super-admin/require-session";

const createUserBodySchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().email("Valid email is required").transform((value) => value.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["general_manager", "hr", "branch_manager"], { error: "Invalid role" }),
  branch_id: z.string().nullable().optional(),
  new_branch: z
    .object({
      name: z.string().optional(),
      location: z.string().optional(),
    })
    .nullable()
    .optional(),
});

export async function POST(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(createUserBodySchema, raw);
  if (!parsed.ok) return parsed.response;

  const { full_name, email, password, role, new_branch } = parsed.data;
  let branch_id = parsed.data.branch_id ?? null;

  try {
    const supabase = createServiceRoleClient();

    if (role === "branch_manager") {
      if (new_branch?.name?.trim()) {
        const bName = new_branch.name.trim();
        const bLoc = new_branch.location?.trim() || null;
        const { data: created, error: bErr } = await supabase.from("branches").insert({ name: bName, location: bLoc }).select("id").single();
        if (bErr || !created) return NextResponse.json({ error: bErr?.message ?? "Failed to create branch" }, { status: 400 });
        branch_id = created.id;
      }
      if (!branch_id) {
        return NextResponse.json({ error: "Branch manager requires a branch (select existing or create new)" }, { status: 400 });
      }
    } else {
      branch_id = null;
    }

    const password_hash = bcrypt.hashSync(password, 12);

    const { data: existing } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
    if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

    const { data: user, error } = await supabase
      .from("users")
      .insert({
        full_name,
        email,
        password_hash,
        role,
        branch_id,
        is_active: true,
      })
      .select("id, full_name, email, role, branch_id, is_active, created_at")
      .single();

    if (error || !user) {
      return NextResponse.json({ error: error?.message ?? "Failed to create user" }, { status: 400 });
    }

    return NextResponse.json({ user });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
