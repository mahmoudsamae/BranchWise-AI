import { NextResponse } from "next/server";

import { getBerlinMonthRange } from "@/lib/branch/overtime-summary";
import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { aggregateStaffMetrics, filterReportRowsByPeriod } from "@/lib/staff/aggregate-metrics";
import { fetchBranchReportEntries } from "@/lib/staff/fetch-branch-entries";
import { roundStaffHours } from "@/lib/staff/format-hours";
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

    const [{ data, error }, entries] = await Promise.all([
      q,
      fetchBranchReportEntries(supabase, branchId),
    ]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: branch } = await supabase.from("branches").select("name").eq("id", branchId).maybeSingle();

    const month = getBerlinMonthRange();
    const monthRows = filterReportRowsByPeriod(entries, month.start, month.end);
    const monthMetrics = aggregateStaffMetrics(monthRows);
    const allMetrics = aggregateStaffMetrics(entries);

    const staff = (data ?? []).map((s) => {
      const m = monthMetrics.get(s.id);
      const a = allMetrics.get(s.id);
      return {
        ...s,
        branch_name: branch?.name ?? "—",
        metrics: {
          month_overtime: roundStaffHours(m?.total_overtime ?? 0),
          total_overtime: roundStaffHours(a?.total_overtime ?? 0),
          month_hours: roundStaffHours(m?.total_hours ?? 0),
          report_count: a?.report_count ?? 0,
        },
      };
    });

    return NextResponse.json({ staff, period: month });
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
