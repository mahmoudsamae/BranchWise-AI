"use client";

import {
  Building2,
  FileText,
  FolderKanban,
  Home,
  Settings,
  Star,
  Users,
} from "lucide-react";

import { Sidebar, type NavItem } from "@/components/ui/Sidebar";

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <Home className="size-4" aria-hidden /> },
  { href: "/dashboard/branches", label: "Filialen", icon: <Building2 className="size-4" aria-hidden /> },
  { href: "/dashboard/projects", label: "Projekte", icon: <FolderKanban className="size-4" aria-hidden /> },
  { href: "/dashboard/reports", label: "Berichte", icon: <FileText className="size-4" aria-hidden /> },
  { href: "/dashboard/bewertungen", label: "Bewertungen", icon: <Star className="size-4" aria-hidden /> },
  { href: "/dashboard/team", label: "Team", icon: <Users className="size-4" aria-hidden /> },
  { href: "/dashboard/account", label: "Einstellungen", icon: <Settings className="size-4" aria-hidden /> },
];

export default function DashboardSidebar({ displayName, email }: { displayName: string; email: string }) {
  return (
    <Sidebar
      subtitle="Operationsleitung"
      meta="Filialbetrieb"
      homeHref="/dashboard"
      items={nav}
      user={{ name: displayName, email }}
    />
  );
}
