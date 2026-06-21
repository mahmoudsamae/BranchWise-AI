import { Suspense } from "react";

import { BranchIssuesHub } from "@/components/branch/issues/branch-issues-hub";
import { demoBranchDashboard } from "@/lib/demo/mock-data";
import { isDemoSession } from "@/lib/demo/guard";
import { listIssuesForUser } from "@/lib/branch/problems";
import { getSessionUserServer } from "@/lib/session";

export default async function BranchProjectsPage() {
  const session = await getSessionUserServer();
  let issues = demoBranchDashboard().issues;

  if (!isDemoSession(session) && session?.branch_id) {
    try {
      issues = await listIssuesForUser(session.branch_id, session.id);
    } catch {
      issues = [];
    }
  }

  return (
    <Suspense fallback={<p className="text-[#9ca3af]">Laden…</p>}>
      <BranchIssuesHub initialIssues={issues} />
    </Suspense>
  );
}
