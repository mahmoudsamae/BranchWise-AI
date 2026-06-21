"use client";

import {
  AlertTriangle,
  BarChart3,
  Download,
  FileCheck,
  FileText,
  FolderKanban,
  Home,
  KeyRound,
  MessageCircle,
  ScrollText,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import { useStaffDiscussionUnread } from "@/components/notifications/use-staff-discussion-unread";
import { Sidebar, type NavEntry } from "@/components/ui/Sidebar";

export function HrSidebarClient({ displayName, email }: { displayName: string; email: string }) {
  const { count } = useStaffDiscussionUnread();

  const nav: NavEntry[] = [
    { href: "/hr", label: "Dashboard", icon: <Home className="size-4" aria-hidden /> },
    {
      href: "/hr/staff",
      label: "Mitarbeiterregister",
      icon: <Users className="size-4" aria-hidden />,
      badge: count > 0 ? count : undefined,
    },
    {
      label: "Unternehmensformulare",
      icon: <FolderKanban className="size-4" aria-hidden />,
      children: [
        { href: "/hr/onboarding", label: "Onboarding", icon: <UserPlus className="size-3.5" aria-hidden /> },
        { href: "/hr/document-renewal", label: "Dokumente", icon: <FileCheck className="size-3.5" aria-hidden /> },
        { href: "/hr/policies", label: "Richtlinien", icon: <ScrollText className="size-3.5" aria-hidden /> },
        { href: "/hr/incidents", label: "Vorfälle", icon: <AlertTriangle className="size-3.5" aria-hidden /> },
      ],
    },
    { href: "/hr/reports", label: "Berichte", icon: <FileText className="size-4" aria-hidden /> },
    { href: "/hr/analytics", label: "Analytics", icon: <BarChart3 className="size-4" aria-hidden /> },
    { href: "/hr/ki-chat", label: "KI-Chat", icon: <Sparkles className="size-4" aria-hidden /> },
    { href: "/hr/communication", label: "Kommunikation", icon: <MessageCircle className="size-4" aria-hidden /> },
    { href: "/hr/exports", label: "Exporte", icon: <Download className="size-4" aria-hidden /> },
    { href: "/hr/account", label: "Einstellungen", icon: <KeyRound className="size-4" aria-hidden /> },
  ];

  return <Sidebar subtitle="HR" homeHref="/hr" items={nav} user={{ name: displayName, email }} />;
}
