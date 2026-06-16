import { demoProfileForRole } from "@/lib/demo/config";
import { isDemoSession } from "@/lib/demo/guard";
import { createServiceRoleClient } from "@/lib/supabase";
import type { SessionPayload } from "@/lib/session";

export type WorkspaceProfile = {
  displayName: string;
  email: string;
  branchName: string | null;
};

export async function resolveWorkspaceProfile(session: SessionPayload): Promise<WorkspaceProfile> {
  if (isDemoSession(session)) {
    const demo = demoProfileForRole(session.role);
    return {
      displayName: demo.displayName,
      email: demo.email,
      branchName: demo.branchName,
    };
  }

  let displayName = session.email;
  let email = session.email;
  let branchName: string | null = null;

  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase.from("users").select("full_name, email").eq("id", session.id).maybeSingle();
    if (data?.email) email = data.email;
    displayName = (data?.full_name && data.full_name.trim()) || data?.email || session.email;

    if (session.branch_id) {
      const { data: branch } = await supabase.from("branches").select("name").eq("id", session.branch_id).maybeSingle();
      if (branch?.name) branchName = branch.name;
    }
  } catch {
    /* missing service key */
  }

  return { displayName, email, branchName };
}
