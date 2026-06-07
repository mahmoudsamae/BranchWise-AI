import { redirect } from "next/navigation";

import { createServiceRoleClient } from "@/lib/supabase";
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

  let displayName = session.email;
  let email = session.email;
  try {
    const supabase = createServiceRoleClient();
    const { data } = await supabase.from("users").select("full_name, email").eq("id", session.id).maybeSingle();
    if (data?.email) email = data.email;
    displayName = (data?.full_name && data.full_name.trim()) || data?.email || session.email;
  } catch {
    /* missing service key */
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-[#f9fafb]">
      <HrSidebar displayName={displayName} email={email} />
      <div className="min-h-screen pt-14 lg:pl-[280px] lg:pt-0">
        <main className="page-enter page-enter-active min-h-screen overflow-y-auto p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
