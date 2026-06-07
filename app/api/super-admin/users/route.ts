import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase";
import { requireSuperAdminApi } from "@/lib/super-admin/require-session";
import { isAppRole, type AppRole } from "@/types/user";

export async function GET(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get("role");
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";

  try {
    const supabase = createServiceRoleClient();
    let q = supabase
      .from("users")
      .select("id, full_name, email, role, branch_id, is_active, created_at")
      .order("created_at", { ascending: false });

    if (roleFilter && roleFilter !== "all" && isAppRole(roleFilter)) {
      q = q.eq("role", roleFilter);
    }

    if (status === "active") q = q.eq("is_active", true);
    else if (status === "inactive") q = q.eq("is_active", false);

    const { data: rows, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    type Row = {
      id: string;
      full_name: string | null;
      email: string;
      role: AppRole;
      branch_id: string | null;
      is_active: boolean;
      created_at: string;
    };

    let list = (rows ?? []) as Row[];

    const branchIds = [...new Set(list.map((u) => u.branch_id).filter((x): x is string => Boolean(x)))];
    const branchNameById = new Map<string, string>();
    if (branchIds.length > 0) {
      const { data: brs } = await supabase.from("branches").select("id, name").in("id", branchIds);
      for (const b of brs ?? []) {
        branchNameById.set(b.id as string, (b.name as string) ?? "");
      }
    }

    if (search) {
      list = list.filter((u) => {
        const name = (u.full_name ?? "").toLowerCase();
        return name.includes(search) || u.email.toLowerCase().includes(search);
      });
    }

    const users = list.map((u) => ({
      id: u.id,
      full_name: u.full_name,
      email: u.email,
      role: u.role,
      branch_id: u.branch_id,
      branch_name: u.branch_id ? (branchNameById.get(u.branch_id) ?? null) : null,
      is_active: u.is_active,
      created_at: u.created_at,
    }));

    return NextResponse.json({ users });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
