import { createServiceRoleClient } from "@/lib/supabase";
import type { SessionPayload } from "@/lib/session";

export type StaffReportEntryRow = {
  id: string;
  staff_member_id: string;
  branch_id: string;
  week_start: string;
  period_end: string | null;
};

export async function loadStaffReportEntry(entryId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("staff_report_entries")
    .select("id, staff_member_id, branch_id, week_start, period_end")
    .eq("id", entryId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as StaffReportEntryRow | null;
}

export function canAccessStaffReportEntry(entry: StaffReportEntryRow, session: SessionPayload): boolean {
  if (session.role === "hr" || session.role === "super_admin") return true;
  if (session.role === "branch_manager" && session.branch_id === entry.branch_id) return true;
  return false;
}
