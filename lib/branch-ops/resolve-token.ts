import { todayWorkDate } from "@/lib/branch-ops/dates";
import { createServiceRoleClient } from "@/lib/supabase";

export { todayWorkDate };

export async function resolveBranchOpsToken(
  token: string,
): Promise<
  | { ok: true; branch_id: string; branch_name: string }
  | { ok: false; error: string; status: number }
> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("branch_ops_tokens")
    .select("branch_id, is_active, branches ( name )")
    .eq("token", token)
    .maybeSingle();

  if (error) return { ok: false, error: error.message, status: 500 };
  if (!data || !data.is_active) return { ok: false, error: "Ops link not available", status: 404 };

  const branch = data.branches as { name: string } | null;
  return { ok: true, branch_id: data.branch_id, branch_name: branch?.name ?? "Branch" };
}

