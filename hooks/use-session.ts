"use client";

import { useEffect, useState } from "react";

export type BranchSessionInfo = {
  fullName: string;
  email: string;
  branchId: string;
  branchName: string;
};

export function useSession() {
  const [session, setSession] = useState<BranchSessionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/branch/session")
      .then((r) => r.json())
      .then((d: BranchSessionInfo & { error?: string }) => {
        if (cancelled) return;
        if (d?.branchId) setSession(d);
        else setSession(null);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { session, loading };
}
