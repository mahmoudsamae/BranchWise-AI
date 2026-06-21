import { redirect } from "next/navigation";

import { InstallPrompt } from "@/components/branch/install-prompt";
import { DemoBanner } from "@/components/demo/demo-banner";
import { isDemoSession } from "@/lib/demo/guard";
import { resolveWorkspaceProfile } from "@/lib/layout/workspace-profile";
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

  const { displayName, branchName } = await resolveWorkspaceProfile(session);

  return (
    <div className="bw-shell">
      {isDemoSession(session) ? <DemoBanner /> : null}
      <BranchSidebar branchName={branchName ?? "Your branch"} displayName={displayName} />
      <div className="min-h-screen pt-14 lg:pl-[280px] lg:pt-0">
        <main className="page-enter page-enter-active min-h-screen overflow-y-auto p-6 md:p-8">
          <InstallPrompt />
          {children}
        </main>
      </div>
    </div>
  );
}
