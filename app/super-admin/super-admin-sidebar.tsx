"use client";

import { Home, KeyRound, Plug, UserPlus, Users } from "lucide-react";

import { Sidebar, type NavItem } from "@/components/ui/Sidebar";

const nav: NavItem[] = [
  { href: "/super-admin", label: "Dashboard", icon: <Home className="size-4" aria-hidden /> },
  { href: "/super-admin/create-account", label: "Create Account", icon: <UserPlus className="size-4" aria-hidden /> },
  { href: "/super-admin/users", label: "All Users", icon: <Users className="size-4" aria-hidden /> },
  { href: "/super-admin/integrations", label: "Integrationen", icon: <Plug className="size-4" aria-hidden /> },
  { href: "/super-admin/account", label: "Account Settings", icon: <KeyRound className="size-4" aria-hidden /> },
];

export default function SuperAdminSidebar({ displayName, email }: { displayName: string; email: string }) {
  return (
    <Sidebar subtitle="Super Admin" homeHref="/super-admin" items={nav} user={{ name: displayName, email }} />
  );
}
