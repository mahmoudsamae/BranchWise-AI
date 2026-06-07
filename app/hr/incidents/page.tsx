import { Suspense } from "react";

import { FormHub } from "@/components/company-forms/form-hub";

export default function IncidentsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[#9ca3af]">Loading…</div>}>
      <FormHub module="incident" />
    </Suspense>
  );
}
