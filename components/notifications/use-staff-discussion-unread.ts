"use client";

import { useCallback, useEffect, useState } from "react";

export function useStaffDiscussionUnread(pollMs = 60_000) {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=1");
      if (!res.ok) return;
      const j = (await res.json()) as { unread_count?: number };
      setCount(j.unread_count ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [refresh, pollMs]);

  return { count, refresh };
}
