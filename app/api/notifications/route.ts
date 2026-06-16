import { NextResponse } from "next/server";

import { isDemoSession } from "@/lib/demo/guard";
import { demoNotifications } from "@/lib/demo/mock-data";
import { requireHrOrBranchManagerApi } from "@/lib/gm-hr/require-session";
import { totalUnreadStaffDiscussionCount } from "@/lib/staff/discussion-notify";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireHrOrBranchManagerApi();
  if (!auth.ok) return auth.response;

  const session = auth.session;
  if (isDemoSession(session)) return NextResponse.json(demoNotifications());

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("user_notifications")
      .select(
        "id, type, staff_report_entry_id, staff_member_id, branch_id, actor_user_id, preview, read_at, created_at",
      )
      .eq("user_id", session.id)
      .eq("type", "staff_report_comment")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ notifications: [], unread_count: 0 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const unread_count = await totalUnreadStaffDiscussionCount(session.id);

    const actorIds = [...new Set((data ?? []).map((n) => n.actor_user_id).filter(Boolean))] as string[];
    const { data: actors } =
      actorIds.length > 0
        ? await supabase.from("users").select("id, full_name, email, role").in("id", actorIds)
        : { data: [] };
    const actorMap = new Map((actors ?? []).map((a) => [a.id, a]));

    return NextResponse.json({
      unread_count,
      notifications: (data ?? []).map((n) => ({
        ...n,
        actor: n.actor_user_id ? (actorMap.get(n.actor_user_id) ?? null) : null,
      })),
    });
  } catch (e) {
    console.error("[GET /api/notifications]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
