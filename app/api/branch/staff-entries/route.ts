import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api/validate-body";
import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { validatePeriod } from "@/lib/staff/period";
import { createServiceRoleClient } from "@/lib/supabase";

const staffEntrySchema = z.object({
  staff_member_id: z.string().trim().min(1, "staff_member_id is required"),
  hours_worked: z.coerce.number().optional().default(0),
  overtime_hours: z.coerce.number().optional().default(0),
  absences: z.coerce.number().optional().default(0),
  late_arrivals: z.coerce.number().optional().default(0),
  notes: z.string().optional(),
});

const staffEntriesBodySchema = z.object({
  report_id: z.string().trim().min(1, "report_id is required"),
  week_start: z.string().optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  entries: z.array(staffEntrySchema).optional().default([]),
});

export async function POST(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const branchId = auth.session.branch_id;
  if (!branchId) return NextResponse.json({ error: "Branch not assigned" }, { status: 403 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(staffEntriesBodySchema, raw);
  if (!parsed.ok) return parsed.response;

  const { report_id: reportId, entries, period_start, period_end, week_start } = parsed.data;
  const period = validatePeriod(
    period_start ?? week_start ?? "",
    period_end ?? period_start ?? week_start ?? "",
  );

  if ("error" in period) {
    return NextResponse.json({ error: period.error }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { data: rep } = await supabase
      .from("reports")
      .select("id, branch_id, template_id")
      .eq("id", reportId)
      .maybeSingle();

    if (!rep || rep.branch_id !== branchId) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const { data: tpl } = await supabase.from("templates").select("type").eq("id", rep.template_id).maybeSingle();
    if (tpl?.type !== "hr") {
      return NextResponse.json({ error: "Not an HR report" }, { status: 400 });
    }

    await supabase.from("staff_report_entries").delete().eq("report_id", reportId);

    if (entries.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    const rows = entries.map((e) => ({
      report_id: reportId,
      staff_member_id: e.staff_member_id,
      branch_id: branchId,
      week_start: period.period_start,
      period_end: period.period_end,
      hours_worked: e.hours_worked,
      overtime_hours: e.overtime_hours,
      absences: e.absences,
      late_arrivals: e.late_arrivals,
      notes: e.notes?.trim() || null,
    }));

    const { error } = await supabase.from("staff_report_entries").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, inserted: rows.length });
  } catch (e) {
    console.error("[POST /api/branch/staff-entries]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
