import { Suspense } from "react";

import { BranchStaffProfile } from "@/components/branch/branch-staff-profile";

export default async function BranchStaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-[#9ca3af]">Loading…</p>}>
      <BranchStaffProfile staffId={id} />
    </Suspense>
  );
}
