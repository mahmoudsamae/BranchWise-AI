import { createServiceRoleClient } from "@/lib/supabase";
import type { SessionPayload } from "@/lib/session";

import type { StaffReportEntryRow } from "./report-entry-access";

export async function notifyStaffReportComment(params: {
  entry: StaffReportEntryRow;
  author: SessionPayload;
  message: string;
}) {
  const supabase = createServiceRoleClient();
  const preview = params.message.trim().slice(0, 160);
  const recipientIds = new Set<string>();

  if (params.author.role === "hr" || params.author.role === "super_admin") {
    const { data: managers } = await supabase
      .from("users")
      .select("id")
      .eq("role", "branch_manager")
      .eq("branch_id", params.entry.branch_id);

    for (const m of managers ?? []) recipientIds.add(m.id);
  } else if (params.author.role === "branch_manager") {
    const { data: hrUsers } = await supabase.from("users").select("id").eq("role", "hr");
    for (const u of hrUsers ?? []) recipientIds.add(u.id);
  }

  recipientIds.delete(params.author.id);
  if (recipientIds.size === 0) return;

  const rows = [...recipientIds].map((user_id) => ({
    user_id,
    type: "staff_report_comment",
    staff_report_entry_id: params.entry.id,
    staff_member_id: params.entry.staff_member_id,
    branch_id: params.entry.branch_id,
    actor_user_id: params.author.id,
    preview,
  }));

  await supabase.from("user_notifications").insert(rows);
}

export async function unreadCountsForEntries(userId: string, entryIds: string[]) {
  if (entryIds.length === 0) return new Map<string, number>();

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("user_notifications")
    .select("staff_report_entry_id")
    .eq("user_id", userId)
    .eq("type", "staff_report_comment")
    .is("read_at", null)
    .in("staff_report_entry_id", entryIds);

  if (error) return new Map<string, number>();

  const map = new Map<string, number>();
  for (const row of data ?? []) {
    const id = row.staff_report_entry_id as string;
    map.set(id, (map.get(id) ?? 0) + 1);
  }
  return map;
}

export async function markEntryNotificationsRead(userId: string, entryId: string) {
  const supabase = createServiceRoleClient();
  await supabase
    .from("user_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("staff_report_entry_id", entryId)
    .eq("type", "staff_report_comment")
    .is("read_at", null);
}

export async function totalUnreadStaffDiscussionCount(userId: string) {
  const supabase = createServiceRoleClient();
  const { count, error } = await supabase
    .from("user_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", "staff_report_comment")
    .is("read_at", null);

  if (error) return 0;
  return count ?? 0;
}
