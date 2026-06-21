import { Suspense } from "react";

import { GmIssuesHub } from "@/components/dashboard/gm-issues-hub";

export default function DashboardProjectsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--text-muted)]">Laden…</p>}>
      <GmIssuesHub />
    </Suspense>
  );
}
