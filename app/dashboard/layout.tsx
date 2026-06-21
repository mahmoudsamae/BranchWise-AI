import { redirect } from "next/navigation";

import { DemoBanner } from "@/components/demo/demo-banner";
import { isDemoSession } from "@/lib/demo/guard";
import { resolveWorkspaceProfile } from "@/lib/layout/workspace-profile";
import { getSessionUserServer } from "@/lib/session";
import type { AppRole } from "@/types/user";

import DashboardSidebar from "./dashboard-sidebar";

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

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserServer();
  if (!session) redirect("/login?next=/dashboard");
  if (session.role !== "general_manager") redirect(homeForRole(session.role));

  const { displayName, email } = await resolveWorkspaceProfile(session);

  return (
    <div className="bw-shell">
      {isDemoSession(session) ? <DemoBanner /> : null}
      <DashboardSidebar displayName={displayName} email={email} />
      <div className="min-h-screen pt-14 lg:pl-[280px] lg:pt-0">
        <main className="page-enter page-enter-active min-h-screen overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
