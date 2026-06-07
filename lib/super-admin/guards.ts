import type { SupabaseClient } from "@supabase/supabase-js";

export async function countActiveSuperAdmins(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true })
    .eq("role", "super_admin")
    .eq("is_active", true);
  if (error) return 0;
  return count ?? 0;
}
