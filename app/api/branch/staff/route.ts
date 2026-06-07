import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

/** Branch managers: read-only list of staff for their branch (HR manages create/edit/deactivate). */
export async function GET(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const branchId = auth.session.branch_id;
  if (!branchId) return NextResponse.json({ error: "Branch not assigned" }, { status: 403 });

  const url = new URL(request.url);
  const employmentType = url.searchParams.get("employment_type")?.trim() || null;
  const activeOnly = url.searchParams.get("active") !== "false";

  try {
    const supabase = createServiceRoleClient();
    let q = supabase
      .from("staff_members")
      .select("id, full_name, branch_id, position, employment_type, start_date, is_active, created_at")
      .eq("branch_id", branchId)
      .order("full_name");

    if (employmentType) q = q.eq("employment_type", employmentType);
    if (activeOnly) q = q.eq("is_active", true);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: branch } = await supabase.from("branches").select("name").eq("id", branchId).maybeSingle();

    const staff = (data ?? []).map((s) => ({
      ...s,
      branch_name: branch?.name ?? "—",
    }));

    return NextResponse.json({ staff });
  } catch (e) {
    console.error("[GET /api/branch/staff]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Staff management is handled by HR. Contact your HR department to add staff members." },
    { status: 403 },
  );
}
