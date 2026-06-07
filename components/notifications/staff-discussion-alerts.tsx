"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";

type NotificationRow = {
  id: string;
  staff_report_entry_id: string;
  staff_member_id: string;
  preview: string | null;
  read_at: string | null;
  created_at: string;
  actor: { full_name: string | null; email: string | null } | null;
};

export function StaffDiscussionAlerts({
  profileBasePath,
}: {
  profileBasePath: "/hr/staff" | "/branch/staff";
}) {
  const [items, setItems] = useState<NotificationRow[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=5");
      if (!res.ok) return;
      const j = (await res.json()) as { notifications?: NotificationRow[] };
      const unread = (j.notifications ?? []).filter((n) => !n.read_at);
      setItems(unread);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 45_000);
    return () => window.clearInterval(id);
  }, [load]);

  const unread = items;
  if (unread.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-100">
        <Bell className="size-4" />
        New report discussions
      </p>
      <ul className="mt-2 space-y-2">
        {unread.slice(0, 5).map((n) => {
          const name = n.actor?.full_name || n.actor?.email || "Someone";
          const href = `${profileBasePath}/${n.staff_member_id}?entry=${n.staff_report_entry_id}`;
          return (
            <li key={n.id}>
              <Link href={href} className="block rounded-lg border border-amber-500/20 bg-[#0a0f1e]/60 px-3 py-2 text-sm hover:border-amber-500/40">
                <span className="font-medium text-white">{name}</span>
                <span className="mt-0.5 block text-xs text-amber-200/80 line-clamp-2">
                  {n.preview || "New message on a staff report"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
