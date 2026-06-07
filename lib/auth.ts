import "server-only";

import { createServiceRoleClient } from "@/lib/supabase";
import { getSessionUser } from "@/lib/session";
import type { AppUser } from "@/types/user";

/**
 * Current user row from `public.users` (validated JWT + DB lookup).
 * Requires `SUPABASE_SERVICE_ROLE_KEY` to query `users`.
 */
export async function getSession(): Promise<AppUser | null> {
  const jwtUser = await getSessionUser();
  if (!jwtUser) return null;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.from("users").select("*").eq("id", jwtUser.id).maybeSingle<AppUser>();

  if (error || !data) return null;
  if (data.email !== jwtUser.email || data.role !== jwtUser.role) return null;
  const dbBranch = data.branch_id ?? null;
  const jwtBranch = jwtUser.branch_id ?? null;
  if (dbBranch !== jwtBranch) return null;
  return data;
}

export async function getUserRole(): Promise<string | null> {
  const user = await getSession();
  return user?.role ?? null;
}
