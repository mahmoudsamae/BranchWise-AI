import { Suspense } from "react";

import { FormHub } from "@/components/company-forms/form-hub";

export default function PoliciesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[#9ca3af]">Loading…</div>}>
      <FormHub module="policy" />
    </Suspense>
  );
}
