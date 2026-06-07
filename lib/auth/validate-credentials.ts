import bcrypt from "bcryptjs";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/types/user";
import { isAppRole } from "@/types/user";

export type AuthUserRow = {
  id: string;
  email: string;
  password_hash: string;
  role: AppRole;
  branch_id: string | null;
  is_active?: boolean | null;
};

export async function validateUserCredentials(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<{ ok: true; user: AuthUserRow } | { ok: false; status: number; error: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !password) {
    return { ok: false, status: 400, error: "Email and password are required" };
  }

  const { data: rows, error } = await supabase
    .from("users")
    .select("id,email,password_hash,role,branch_id,is_active")
    .eq("email", normalized)
    .limit(2);

  if (error) {
    console.error("[auth] users query error:", error.message);
    return { ok: false, status: 401, error: "Invalid email or password" };
  }

  if (rows && rows.length > 1) {
    return { ok: false, status: 401, error: "Invalid email or password" };
  }

  const user = rows?.[0];
  if (!user) {
    return { ok: false, status: 401, error: "Invalid email or password" };
  }

  const hash = String(user.password_hash ?? "").trim();
  const passwordValid = hash.startsWith("$2") && (await bcrypt.compare(password, hash));
  if (!passwordValid) {
    return { ok: false, status: 401, error: "Invalid email or password" };
  }

  if (user.is_active === false) {
    return { ok: false, status: 403, error: "Account is inactive" };
  }

  if (!isAppRole(user.role)) {
    return { ok: false, status: 403, error: "Invalid user role" };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      role: user.role,
      branch_id: user.branch_id,
      is_active: user.is_active,
    },
  };
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.length <= 2 ? local[0] ?? "*" : local.slice(0, 2);
  return `${visible}***@${domain}`;
}
