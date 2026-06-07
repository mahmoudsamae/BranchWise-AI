import { NextResponse } from "next/server";

import { requireHrApi } from "@/lib/gm-hr/require-session";
import { aggregateStaffMetrics, emptyStaffMetrics, filterReportRowsByPeriod, type StaffReportRow } from "@/lib/staff/aggregate-metrics";
import { branchAbbrev, branchLetter } from "@/lib/staff/branch-abbrev";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch_id")?.trim() || null;
  const employmentType = url.searchParams.get("employment_type")?.trim() || null;
  const activeOnly = url.searchParams.get("active") !== "false";
  const periodFrom = url.searchParams.get("period_from")?.trim() || null;
  const periodTo = url.searchParams.get("period_to")?.trim() || null;

  try {
    const supabase = createServiceRoleClient();
    let q = supabase
      .from("staff_members")
      .select("id, full_name, branch_id, position, employment_type, start_date, is_active, created_at")
      .order("full_name");

    if (branchId) q = q.eq("branch_id", branchId);
    if (employmentType) q = q.eq("employment_type", employmentType);
    if (activeOnly) q = q.eq("is_active", true);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const branchIds = [...new Set((data ?? []).map((s) => s.branch_id).filter(Boolean))] as string[];
    const { data: branches } =
      branchIds.length > 0 ? await supabase.from("branches").select("id, name").in("id", branchIds) : { data: [] };
    const branchName = new Map((branches ?? []).map((b) => [b.id, b.name]));

    const staffIds = (data ?? []).map((s) => s.id);
    let metricsByStaff = new Map<string, ReturnType<typeof emptyStaffMetrics>>();

    if (staffIds.length > 0) {
      const { data: entries, error: eErr } = await supabase
        .from("staff_report_entries")
        .select(
          "staff_member_id, hours_worked, overtime_hours, absences, late_arrivals, week_start, period_end",
        )
        .in("staff_member_id", staffIds);

      if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

      let entryRows: StaffReportRow[] = (entries ?? []) as StaffReportRow[];
      if (periodFrom && periodTo) {
        entryRows = filterReportRowsByPeriod(entryRows, periodFrom, periodTo);
      }
      metricsByStaff = aggregateStaffMetrics(entryRows);
    }

    const staff = (data ?? []).map((s) => {
      const name = branchName.get(s.branch_id as string) ?? "—";
      const metrics = metricsByStaff.get(s.id) ?? emptyStaffMetrics();
      return {
        ...s,
        branch_name: name,
        branch_code: name === "—" ? "—" : branchAbbrev(name),
        branch_letter: name === "—" ? "—" : branchLetter(name),
        metrics,
      };
    });

    const summary = staff.reduce(
      (acc, s) => ({
        total_staff: acc.total_staff + 1,
        active_staff: acc.active_staff + (s.is_active ? 1 : 0),
        total_overtime: acc.total_overtime + s.metrics.total_overtime,
        total_absences: acc.total_absences + s.metrics.total_absences,
        no_reports: acc.no_reports + (s.metrics.report_count === 0 ? 1 : 0),
      }),
      { total_staff: 0, active_staff: 0, total_overtime: 0, total_absences: 0, no_reports: 0 },
    );

    return NextResponse.json({
      staff,
      summary,
      period:
        periodFrom && periodTo ? { from: periodFrom, to: periodTo } : null,
    });
  } catch (e) {
    console.error("[GET /api/hr/staff]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  let body: {
    full_name?: string;
    branch_id?: string;
    position?: string;
    employment_type?: string;
    start_date?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const full_name = String(body.full_name ?? "").trim();
  const branch_id = String(body.branch_id ?? "").trim();
  const position = String(body.position ?? "").trim();
  if (!full_name || !branch_id || !position) {
    return NextResponse.json({ error: "full_name, branch_id, and position are required" }, { status: 400 });
  }

  const employment_type = body.employment_type;
  if (employment_type && !["full_time", "part_time", "minijob"].includes(employment_type)) {
    return NextResponse.json({ error: "Invalid employment_type" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("staff_members")
      .insert({
        full_name,
        branch_id,
        position,
        employment_type: employment_type ?? null,
        start_date: body.start_date ?? null,
        is_active: true,
        created_by: auth.session.id,
      })
      .select("id, full_name, branch_id, position, employment_type, start_date, is_active")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ staff: data });
  } catch (e) {
    console.error("[POST /api/hr/staff]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
