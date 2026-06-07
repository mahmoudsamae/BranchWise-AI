import { Suspense } from "react";

import { ReportsHub } from "@/components/reports/reports-hub";

export default function HrReportsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#9ca3af]">Berichte werden geladen…</p>}>
      <ReportsHub basePath="/hr" workspaceTitle="HR" allowedTemplateTypes={["hr"]} defaultTemplateType="hr" />
    </Suspense>
  );
}
