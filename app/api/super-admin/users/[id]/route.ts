import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase";
import type { TablesUpdate } from "@/lib/database.types";
import { isSupabaseTimeoutError } from "@/lib/supabase-timeout";
import { countActiveSuperAdmins } from "@/lib/super-admin/guards";
import { requireSuperAdminApi } from "@/lib/super-admin/require-session";
import { isAppRole, type AppRole } from "@/types/user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchBody = {
  full_name?: string;
  email?: string;
  role?: string;
  branch_id?: string | null;
  is_active?: boolean;
  password?: string;
};

type UserRow = {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
};

const USER_COLUMNS = "id, full_name, email, role, branch_id, is_active, created_at";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: current, error: loadErr } = await supabase
      .from("users")
      .select(USER_COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (loadErr) {
      return NextResponse.json({ error: loadErr.message }, { status: 500 });
    }
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const nextActive = body.is_active !== undefined ? Boolean(body.is_active) : Boolean(current.is_active);
    const nextRole = body.role !== undefined ? String(body.role) : current.role;

    if (body.is_active === false && current.role === "super_admin" && current.is_active) {
      const n = await countActiveSuperAdmins(supabase);
      if (n <= 1) {
        return NextResponse.json({ error: "Cannot deactivate the last active super admin" }, { status: 400 });
      }
    }

    if (body.role !== undefined && current.role === "super_admin" && body.role !== "super_admin") {
      if (current.is_active) {
        const n = await countActiveSuperAdmins(supabase);
        if (n <= 1) {
          return NextResponse.json({ error: "Cannot change role of the last active super admin" }, { status: 400 });
        }
      }
    }

    if (body.role !== undefined && !isAppRole(nextRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const resolvedBranchId = (() => {
      if (nextRole !== "branch_manager") return null;
      const fromBody =
        body.branch_id !== undefined && body.branch_id !== null && String(body.branch_id).trim() !== ""
          ? String(body.branch_id).trim()
          : null;
      return fromBody ?? current.branch_id ?? null;
    })();

    if (nextRole === "branch_manager" && !resolvedBranchId) {
      return NextResponse.json({ error: "Branch manager requires a branch" }, { status: 400 });
    }

    const updates: TablesUpdate<"users"> = {};

    if (body.full_name !== undefined) updates.full_name = String(body.full_name).trim() || null;

    if (body.email !== undefined) {
      const email = String(body.email).trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: "Invalid email" }, { status: 400 });
      }
      if (email !== current.email.toLowerCase()) {
        const { data: dupRows, error: dupErr } = await supabase
          .from("users")
          .select("id")
          .ilike("email", email)
          .neq("id", id)
          .limit(1);
        if (dupErr) return NextResponse.json({ error: dupErr.message }, { status: 500 });
        if (dupRows && dupRows.length > 0) {
          return NextResponse.json({ error: "Email already in use" }, { status: 409 });
        }
      }
      updates.email = email;
    }

    if (body.role !== undefined) updates.role = nextRole as AppRole;
    if (body.is_active !== undefined) updates.is_active = nextActive;

    if (body.role !== undefined) {
      updates.branch_id = nextRole === "branch_manager" ? resolvedBranchId : null;
    } else if (body.branch_id !== undefined && nextRole === "branch_manager") {
      updates.branch_id = resolvedBranchId;
    }

    if (body.password !== undefined && body.password !== "") {
      if (String(body.password).length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      updates.password_hash = bcrypt.hashSync(String(body.password), 12);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ user: current as UserRow });
    }

    let { data: updated, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", id)
      .select(USER_COLUMNS)
      .maybeSingle();

    if (error?.code === "42703" || error?.message?.toLowerCase().includes("updated_at")) {
      ({ data: updated, error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", id)
        .select(USER_COLUMNS)
        .maybeSingle());
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!updated) return NextResponse.json({ error: "Update failed — user not found" }, { status: 404 });

    return NextResponse.json({ user: updated });
  } catch (e) {
    if (isSupabaseTimeoutError(e)) {
      return NextResponse.json(
        {
          error:
            "Database connection timed out. Check NEXT_PUBLIC_SUPABASE_URL, your network, and Supabase project status.",
        },
        { status: 504 },
      );
    }
    console.error("[PATCH /api/super-admin/users/[id]]", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  if (id === auth.session.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: target, error: loadErr } = await supabase
      .from("users")
      .select("id, role, is_active")
      .eq("id", id)
      .maybeSingle();
    if (loadErr) return NextResponse.json({ error: loadErr.message }, { status: 500 });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (target.role === "super_admin" && target.is_active) {
      const n = await countActiveSuperAdmins(supabase);
      if (n <= 1) {
        return NextResponse.json({ error: "Cannot remove the last active super admin" }, { status: 400 });
      }
    }

    let { error } = await supabase
      .from("users")
      .update({ is_active: false })
      .eq("id", id);

    if (error?.code === "42703" || error?.message?.toLowerCase().includes("updated_at")) {
      ({ error } = await supabase.from("users").update({ is_active: false }).eq("id", id));
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isSupabaseTimeoutError(e)) {
      return NextResponse.json({ error: "Database connection timed out" }, { status: 504 });
    }
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
