"use client";

import {
  BarChart3,
  Building2,
  CalendarClock,
  Coffee,
  Download,
  FileText,
  Home,
  KeyRound,
  MessageCircle,
  Sparkles,
  Star,
} from "lucide-react";

import { Sidebar, type NavItem } from "@/components/ui/Sidebar";

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: <Home className="size-4" aria-hidden /> },
  { href: "/dashboard/branches", label: "Branches", icon: <Building2 className="size-4" aria-hidden /> },
  { href: "/dashboard/bewertungen", label: "Bewertungen", icon: <Star className="size-4" aria-hidden /> },
  { href: "/dashboard/reports", label: "Reports", icon: <FileText className="size-4" aria-hidden /> },
  { href: "/dashboard/schedules", label: "Schedules", icon: <CalendarClock className="size-4" aria-hidden /> },
  { href: "/dashboard/analytics", label: "Analytics", icon: <BarChart3 className="size-4" aria-hidden /> },
  { href: "/dashboard/ki-chat", label: "KI-Chat", icon: <Sparkles className="size-4" aria-hidden /> },
  { href: "/dashboard/communication", label: "Communication", icon: <MessageCircle className="size-4" aria-hidden /> },
  { href: "/dashboard/fruhstuck", label: "Frühstück", icon: <Coffee className="size-4" aria-hidden /> },
  { href: "/dashboard/exports", label: "Exports", icon: <Download className="size-4" aria-hidden /> },
  { href: "/dashboard/account", label: "Account Settings", icon: <KeyRound className="size-4" aria-hidden /> },
];

export default function DashboardSidebar({ displayName, email }: { displayName: string; email: string }) {
  return (
    <Sidebar
      subtitle="General Manager"
      homeHref="/dashboard"
      items={nav}
      user={{ name: displayName, email }}
    />
  );
}
