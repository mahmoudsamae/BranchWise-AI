import type { SupabaseClient } from "@supabase/supabase-js";

import { paginateRows } from "@/lib/fruhstuck/paginated-orders";

import type { StaffReportRow } from "./aggregate-metrics";

const ENTRY_SELECT =
  "staff_member_id, hours_worked, overtime_hours, absences, late_arrivals, week_start, period_end, created_at, branch_id";

/** All staff report rows for a branch (by staff membership, not entry.branch_id). */
export async function fetchBranchReportEntries(
  supabase: SupabaseClient,
  branchId: string,
): Promise<StaffReportRow[]> {
  const { data: staff, error: staffErr } = await supabase
    .from("staff_members")
    .select("id")
    .eq("branch_id", branchId);

  if (staffErr) throw new Error(staffErr.message);

  const staffIds = (staff ?? []).map((s) => s.id);
  if (!staffIds.length) return [];

  return paginateRows<StaffReportRow>(async (from, to) => {
    const result = await supabase
      .from("staff_report_entries")
      .select(ENTRY_SELECT)
      .in("staff_member_id", staffIds)
      .order("week_start", { ascending: false })
      .range(from, to);
    return {
      data: (result.data ?? []) as StaffReportRow[],
      error: result.error,
    };
  });
}

/** All report rows for one staff member (paginated, no 1000-row cap). */
export async function fetchStaffReportEntries(
  supabase: SupabaseClient,
  staffMemberId: string,
): Promise<StaffReportRow[]> {
  return paginateRows<StaffReportRow>(async (from, to) => {
    const result = await supabase
      .from("staff_report_entries")
      .select(ENTRY_SELECT)
      .eq("staff_member_id", staffMemberId)
      .order("week_start", { ascending: false })
      .range(from, to);
    return {
      data: (result.data ?? []) as StaffReportRow[],
      error: result.error,
    };
  });
}
