import { NextResponse } from "next/server";

import { requireHrApi } from "@/lib/gm-hr/require-session";
import { unreadCountsForEntries } from "@/lib/staff/discussion-notify";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  try {
    const supabase = createServiceRoleClient();

    const { data: member, error: mErr } = await supabase
      .from("staff_members")
      .select("id, full_name, branch_id, position, employment_type, start_date, is_active")
      .eq("id", id)
      .maybeSingle();

    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (!member.branch_id) {
      return NextResponse.json({ error: "Staff member has no branch assigned" }, { status: 404 });
    }

    const { data: branch } = await supabase.from("branches").select("name").eq("id", member.branch_id).maybeSingle();

    const { data: entries, error: eErr } = await supabase
      .from("staff_report_entries")
      .select(
        "id, week_start, period_end, hours_worked, overtime_hours, absences, late_arrivals, notes, summary, created_at, report_id",
      )
      .eq("staff_member_id", id)
      .order("week_start", { ascending: false })
      .limit(52);

    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

    const entryList = entries ?? [];
    const unreadMap = await unreadCountsForEntries(
      auth.session.id,
      entryList.map((e) => e.id),
    );
    const discussion_unread: Record<string, number> = {};
    for (const [k, v] of unreadMap) discussion_unread[k] = v;

    return NextResponse.json({
      staff: { ...member, branch_name: branch?.name ?? "—" },
      entries: entryList,
      discussion_unread,
    });
  } catch (e) {
    console.error("[GET /api/hr/staff/[id]/history]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
