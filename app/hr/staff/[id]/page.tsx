import { Suspense } from "react";

import { StaffProfile } from "@/components/hr/staff-profile";

export default async function HrStaffProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense fallback={<p className="text-[#9ca3af]">Loading…</p>}>
      <StaffProfile staffId={id} />
    </Suspense>
  );
}
