/** Row shape for `public.users` (custom auth, not Supabase Auth). */
export type AppUser = {
  id: string;
  email: string;
  password_hash: string;
  role: AppRole;
  branch_id: string | null;
  full_name: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AppRole = "super_admin" | "general_manager" | "hr" | "branch_manager";

export const APP_ROLES: AppRole[] = ["super_admin", "general_manager", "hr", "branch_manager"];

export function isAppRole(value: string): value is AppRole {
  return (APP_ROLES as readonly string[]).includes(value);
}
