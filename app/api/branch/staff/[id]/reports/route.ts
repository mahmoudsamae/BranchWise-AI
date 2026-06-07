import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { validatePeriod } from "@/lib/staff/period";
import { createServiceRoleClient } from "@/lib/supabase";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const branchId = auth.session.branch_id;
  if (!branchId) return NextResponse.json({ error: "Branch not assigned" }, { status: 403 });

  const { id: staffMemberId } = await ctx.params;

  let body: {
    period_start?: string;
    period_end?: string;
    week_start?: string;
    hours_worked?: number;
    overtime_hours?: number;
    absences?: number;
    late_arrivals?: number;
    summary?: string;
    notes?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const period = validatePeriod(
    String(body.period_start ?? body.week_start ?? ""),
    String(body.period_end ?? body.period_start ?? body.week_start ?? ""),
  );
  if ("error" in period) {
    return NextResponse.json({ error: period.error }, { status: 400 });
  }

  const summary = String(body.summary ?? "").trim();
  if (!summary) {
    return NextResponse.json({ error: "summary is required" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: member, error: mErr } = await supabase
      .from("staff_members")
      .select("id")
      .eq("id", staffMemberId)
      .eq("branch_id", branchId)
      .maybeSingle();

    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
    if (!member) return NextResponse.json({ error: "Staff member not found" }, { status: 404 });

    const { data, error } = await supabase
      .from("staff_report_entries")
      .insert({
        report_id: null,
        staff_member_id: staffMemberId,
        branch_id: branchId,
        week_start: period.period_start,
        period_end: period.period_end,
        hours_worked: Number(body.hours_worked ?? 0),
        overtime_hours: Number(body.overtime_hours ?? 0),
        absences: Number(body.absences ?? 0),
        late_arrivals: Number(body.late_arrivals ?? 0),
        summary,
        notes: body.notes?.trim() || null,
        created_by: auth.session.id,
      })
      .select(
        "id, week_start, period_end, hours_worked, overtime_hours, absences, late_arrivals, notes, summary, report_id, created_at",
      )
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ entry: data });
  } catch (e) {
    console.error("[POST /api/branch/staff/[id]/reports]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
