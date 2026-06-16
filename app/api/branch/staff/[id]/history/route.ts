import { NextResponse } from "next/server";

import { getBerlinMonthRange } from "@/lib/branch/overtime-summary";
import { requireBranchManagerApi } from "@/lib/branch/require-session";
import {
  aggregateStaffMetrics,
  emptyStaffMetrics,
  filterReportRowsByPeriod,
} from "@/lib/staff/aggregate-metrics";
import { fetchStaffReportEntries } from "@/lib/staff/fetch-branch-entries";
import { roundStaffHours } from "@/lib/staff/format-hours";
import { unreadCountsForEntries } from "@/lib/staff/discussion-notify";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const branchId = auth.session.branch_id;
  if (!branchId) return NextResponse.json({ error: "Branch not assigned" }, { status: 403 });

  const { id } = await ctx.params;

  try {
    const supabase = createServiceRoleClient();

    const { data: member, error: mErr } = await supabase
      .from("staff_members")
      .select("id, full_name, branch_id, position, employment_type, start_date, is_active")
      .eq("id", id)
      .eq("branch_id", branchId)
      .maybeSingle();

    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
    if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: branch } = await supabase.from("branches").select("name").eq("id", branchId).maybeSingle();

    const [allRows, { data: entries, error: eErr }] = await Promise.all([
      fetchStaffReportEntries(supabase, id),
      supabase
        .from("staff_report_entries")
        .select(
          "id, week_start, period_end, hours_worked, overtime_hours, absences, late_arrivals, notes, summary, report_id, created_at",
        )
        .eq("staff_member_id", id)
        .order("week_start", { ascending: false })
        .limit(52),
    ]);

    if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

    const entryList = entries ?? [];
    const unreadMap = await unreadCountsForEntries(
      auth.session.id,
      entryList.map((e) => e.id),
    );
    const discussion_unread: Record<string, number> = {};
    for (const [k, v] of unreadMap) discussion_unread[k] = v;

    const month = getBerlinMonthRange();
    const monthRows = filterReportRowsByPeriod(allRows, month.start, month.end);
    const allMetrics = aggregateStaffMetrics(allRows).get(id) ?? emptyStaffMetrics();
    const monthMetrics = aggregateStaffMetrics(monthRows).get(id) ?? emptyStaffMetrics();

    return NextResponse.json({
      staff: { ...member, branch_name: branch?.name ?? "—" },
      entries: entryList,
      discussion_unread,
      totals: {
        hours: roundStaffHours(allMetrics.total_hours),
        overtime: roundStaffHours(allMetrics.total_overtime),
        month_overtime: roundStaffHours(monthMetrics.total_overtime),
        absences: allMetrics.total_absences,
        late: allMetrics.total_late,
        month_label: month.label,
      },
    });
  } catch (e) {
    console.error("[GET /api/branch/staff/[id]/history]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
