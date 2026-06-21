import { redirect } from "next/navigation";

import { DemoBanner } from "@/components/demo/demo-banner";
import { isDemoSession } from "@/lib/demo/guard";
import { resolveWorkspaceProfile } from "@/lib/layout/workspace-profile";
import { getSessionUserServer } from "@/lib/session";
import type { AppRole } from "@/types/user";

import HrSidebar from "./hr-sidebar";

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

export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionUserServer();
  if (!session) redirect("/login?next=/hr");
  if (session.role !== "hr") redirect(homeForRole(session.role));

  const { displayName, email } = await resolveWorkspaceProfile(session);

  return (
    <div className="bw-shell">
      {isDemoSession(session) ? <DemoBanner /> : null}
      <HrSidebar displayName={displayName} email={email} />
      <div className="min-h-screen pt-14 lg:pl-[280px] lg:pt-0">
        <main className="page-enter page-enter-active bw-scrollbar min-h-screen overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
