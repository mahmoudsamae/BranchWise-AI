import { redirect } from "next/navigation";

import { InstallPrompt } from "@/components/branch/install-prompt";
import { createServiceRoleClient } from "@/lib/supabase";
import { getSessionUserServer } from "@/lib/session";
import type { AppRole } from "@/types/user";

import BranchSidebar from "./branch-sidebar";

function homeForRole(role: AppRole): string {
  switch (role) {
    case "super_admin":
      return "/super-admin";
    case "general_manager":
      return "/dashboard";
    case "hr":
      return "/hr";
    case "branch_manager":
      return "/branch";
    default:
      return "/login";
  }
}

export default async function BranchLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserServer();
  if (!session) redirect("/login?next=/branch");
  if (session.role !== "branch_manager") redirect(homeForRole(session.role));

  let displayName = session.email;
  let branchName = "Your branch";
  try {
    const supabase = createServiceRoleClient();
    const { data: user } = await supabase.from("users").select("full_name, email").eq("id", session.id).maybeSingle();
    if (user?.email) displayName = (user.full_name && user.full_name.trim()) || user.email;
    if (session.branch_id) {
      const { data: branch } = await supabase.from("branches").select("name").eq("id", session.branch_id).maybeSingle();
      if (branch?.name) branchName = branch.name;
    }
  } catch {
    /* service key missing */
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-[#f9fafb]">
      <BranchSidebar branchName={branchName} displayName={displayName} />
      <div className="min-h-screen pt-14 lg:pl-[280px] lg:pt-0">
        <main className="page-enter page-enter-active min-h-screen overflow-y-auto p-6 md:p-8">
          <InstallPrompt />
          {children}
        </main>
      </div>
    </div>
  );
}
