import { Suspense } from "react";

import { ReportsHub } from "@/components/reports/reports-hub";

export default function DashboardReportsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#9ca3af]">Berichte werden geladen…</p>}>
      <ReportsHub
        basePath="/dashboard"
        workspaceTitle="General Manager"
        allowedTemplateTypes={["daily", "weekly", "surprise"]}
        defaultTemplateType="daily"
      />
    </Suspense>
  );
}
