import { Suspense } from "react";

import { OnboardingHub } from "@/components/onboarding/onboarding-hub";

export default function HrOnboardingPage() {
  return (
    <Suspense fallback={<div className="text-sm text-[#9ca3af]">Loading…</div>}>
      <OnboardingHub />
    </Suspense>
  );
}
