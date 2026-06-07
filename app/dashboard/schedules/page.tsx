import { Suspense } from "react";

import { SchedulesClient } from "@/components/schedules/schedules-client";

export default function DashboardSchedulesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[#9ca3af]">Schedules werden geladen…</p>}>
      <SchedulesClient basePath="/dashboard" allowedTemplateTypes={["daily", "weekly", "surprise"]} />
    </Suspense>
  );
}
