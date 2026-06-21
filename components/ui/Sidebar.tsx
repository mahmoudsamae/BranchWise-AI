"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

export type NavGroup = {
  label: string;
  icon: React.ReactNode;
  children: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

function isActivePath(pathname: string, href: string, homeHref: string) {
  return pathname === href || (href !== homeHref && pathname.startsWith(href));
}

export type SidebarProps = {
  brand?: string;
  subtitle: string;
  meta?: string;
  homeHref: string;
  items: NavEntry[];
  user: { name: string; email?: string };
};

export function Sidebar({ brand = "BranchWise AI", subtitle, meta, homeHref, items, user }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const next: Record<string, boolean> = {};
    for (const entry of items) {
      if (!isNavGroup(entry)) continue;
      const active = entry.children.some((child) => isActivePath(pathname, child.href, homeHref));
      if (active) next[entry.label] = true;
    }
    setExpandedGroups((prev) => ({ ...prev, ...next }));
  }, [pathname, items, homeHref]);

  function toggleGroup(label: string) {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  }

  function renderItem({ href, label, icon, badge }: NavItem, nested?: boolean) {
    const active = isActivePath(pathname, href, homeHref);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
          nested ? "py-2 text-[13px]" : "",
          active
            ? "border-r-2 border-[var(--accent)] bg-gradient-to-r from-[var(--accent)]/20 to-transparent text-[var(--accent-light)] shadow-[inset_0_0_20px_var(--glow-indigo)]"
            : "text-gray-400 hover:bg-[var(--bg-elevated)]/60 hover:text-white",
        )}
      >
        <span className={cn("shrink-0 opacity-90", nested ? "size-3.5" : "size-4")}>{icon}</span>
        <span className="flex-1">{label}</span>
        {badge != null && badge > 0 ? (
          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span>
        ) : null}
      </Link>
    );
  }

  const nav = (
    <>
      <div className="mb-8 border-b border-gray-800 pb-6">
        <Link href={homeHref} className="text-lg font-bold tracking-tight text-white hover:text-gray-200" onClick={() => setOpen(false)}>
          {brand}
        </Link>
        {meta ? <p className="mt-2 truncate text-sm font-medium text-gray-400">{meta}</p> : null}
        <p className="mt-2 inline-flex rounded-full border border-[var(--accent)]/30 bg-gradient-to-r from-[var(--accent)]/15 to-[var(--accent-2)]/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[var(--accent-light)]">
          {subtitle}
        </p>
      </div>

      <nav className="bw-scrollbar -mr-1 flex flex-1 flex-col gap-1 overflow-y-auto pr-1">
        {items.map((entry) => {
          if (!isNavGroup(entry)) return renderItem(entry);

          const expanded = expandedGroups[entry.label] ?? false;
          const groupActive = entry.children.some((child) => isActivePath(pathname, child.href, homeHref));

          return (
            <div key={entry.label} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(entry.label)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition",
                  groupActive ? "text-indigo-300" : "text-gray-400 hover:bg-gray-800 hover:text-white",
                )}
              >
                <span className="size-4 shrink-0 opacity-90">{entry.icon}</span>
                <span className="flex-1">{entry.label}</span>
                <ChevronDown className={cn("size-4 shrink-0 opacity-60 transition", expanded ? "rotate-180" : "")} />
              </button>
              {expanded ? (
                <div className="ml-3 flex flex-col gap-0.5 border-l border-gray-800 pl-2">
                  {entry.children.map((child) => renderItem(child, true))}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-gray-800 pt-6">
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        {user.email ? <p className="mt-0.5 truncate text-xs text-gray-400">{user.email}</p> : null}
        <form action="/api/auth/logout" method="post" className="mt-4">
          <Button type="submit" variant="secondary" className="w-full" size="sm">
            Log out
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-40 flex h-14 items-center justify-between border-b border-gray-800 bg-[#0a0f1e] px-4 lg:hidden">
        <span className="font-bold text-white">{brand}</span>
        <button
          type="button"
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      {open ? (
        <button type="button" className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" aria-label="Close menu" onClick={() => setOpen(false)} />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[var(--border)] bg-[var(--bg-primary)]/95 px-4 py-6 backdrop-blur-md transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          "lg:top-0 lg:z-40",
        )}
      >
        {nav}
      </aside>
    </>
  );
}
