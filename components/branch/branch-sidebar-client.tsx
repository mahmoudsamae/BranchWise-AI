"use client";

import { ClipboardList, Coffee, FileText, Flag, Home, KeyRound, LayoutGrid, MessageCircle, Users } from "lucide-react";

import { useStaffDiscussionUnread } from "@/components/notifications/use-staff-discussion-unread";
import { Sidebar, type NavItem } from "@/components/ui/Sidebar";

export function BranchSidebarClient({
  branchName,
  displayName,
}: {
  branchName: string;
  displayName: string;
}) {
  const { count } = useStaffDiscussionUnread();

  const nav: NavItem[] = [
    { href: "/branch", label: "Dashboard", icon: <Home className="size-4" aria-hidden /> },
    { href: "/branch/reports", label: "My Reports", icon: <FileText className="size-4" aria-hidden /> },
    { href: "/branch/handover", label: "Shift Handover", icon: <ClipboardList className="size-4" aria-hidden /> },
    { href: "/branch/ops", label: "Branch Ops", icon: <LayoutGrid className="size-4" aria-hidden /> },
    { href: "/branch/fruhstuck", label: "Frühstück", icon: <Coffee className="size-4" aria-hidden /> },
    { href: "/branch/projects", label: "Projekte & Probleme", icon: <Flag className="size-4" aria-hidden /> },
    {
      href: "/branch/staff",
      label: "Staff Directory",
      icon: <Users className="size-4" aria-hidden />,
      badge: count > 0 ? count : undefined,
    },
    { href: "/branch/communication", label: "Communication", icon: <MessageCircle className="size-4" aria-hidden /> },
    { href: "/branch/account", label: "Account Settings", icon: <KeyRound className="size-4" aria-hidden /> },
  ];

  return (
    <Sidebar
      subtitle="Branch Manager"
      meta={branchName}
      homeHref="/branch"
      items={nav}
      user={{ name: displayName }}
    />
  );
}
