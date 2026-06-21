export type { TemplateField } from "@/lib/report-builder/template-fields";

import { HR_FIELD_IDS } from "@/lib/hr/default-template";

function num(v: unknown): number {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

function text(v: unknown): string {
  return String(v ?? "").trim();
}

export type ExtractedKPIs = {
  occupancy_rate: number;
  positive_feedback: number;
  negative_feedback: number;
  unpaid_departures: number;
  repeated_issues: number;
  overtime_hours: number;
  support_needed: number;
  staff_on_duty: number;
  absences: number;
  late_arrivals: number;
  staff_morale: string | null;
  has_staff_issues: boolean;
};

export function extractKPIsFromReportData(
  reportId: string,
  reportData: Record<string, unknown>,
): ExtractedKPIs {
  let occupancy_rate = 0;
  let positive_feedback = 0;
  let negative_feedback = 0;
  let unpaid_departures = 0;
  let repeated_issues = 0;
  let overtime_hours = 0;
  let support_needed = 0;
  let staff_on_duty = 0;
  let absences = 0;
  let late_arrivals = 0;
  let staff_morale: string | null = null;
  let has_staff_issues = false;
  let kpiExtracted = false;

  const byId = (id: string) => reportData[id];

  if (
    byId(HR_FIELD_IDS.staffSummary) !== undefined ||
    byId(HR_FIELD_IDS.totalOvertime) !== undefined
  ) {
    kpiExtracted = true;
    overtime_hours = num(byId(HR_FIELD_IDS.totalOvertime));
    absences = num(byId(HR_FIELD_IDS.totalAbsences));
    late_arrivals = num(byId(HR_FIELD_IDS.totalLateArrivals));
    const complaints = text(byId(HR_FIELD_IDS.staffIssues));
    has_staff_issues = complaints.length > 0;
    const morale = text(byId(HR_FIELD_IDS.teamMorale)).toLowerCase();
    staff_morale =
      morale === "good" || morale === "neutral" || morale === "poor" ? morale : morale || null;
    const hq = text(byId(HR_FIELD_IDS.supportNeeded));
    support_needed = hq.length > 0 ? 1 : 0;
    repeated_issues = has_staff_issues ? 1 : 0;
  } else if (byId("staff_on_duty") !== undefined) {
    kpiExtracted = true;
    staff_on_duty = num(byId("staff_on_duty"));
    absences = num(byId("absences_today"));
    late_arrivals = num(byId("late_arrivals"));
    overtime_hours = num(byId("overtime_hours_week"));
    const complaints = text(byId("staff_complaints"));
    has_staff_issues = complaints.length > 0;
    const morale = text(byId("staff_morale")).toLowerCase();
    staff_morale = morale === "good" || morale === "neutral" || morale === "poor" ? morale : null;
    support_needed = text(byId("support_needed_hq")).length > 0 ? 1 : 0;
    repeated_issues = has_staff_issues ? 1 : 0;
  } else {
    // Legacy fallback: keyword-matches field keys when no explicit template IDs are present.
    // New templates should map KPIs via HR_FIELD_IDS or dedicated field-ID constants instead.
    kpiExtracted = true;
    for (const [key, value] of Object.entries(reportData)) {
      const k = key.toLowerCase();
      const v = num(value);

      if (k.includes("occupancy") || k.includes("auslastung") || k.includes("belegung")) occupancy_rate = v;
      else if (k.includes("positive") || k.includes("positiv")) positive_feedback = v;
      else if (k.includes("negative") || k.includes("negativ") || k.includes("complaint") || k.includes("beschwerde"))
        negative_feedback = v;
      else if (k.includes("unpaid") || k.includes("departure") || k.includes("abreise")) unpaid_departures = v;
      else if (k.includes("issue") || k.includes("problem") || k.includes("repeated"))
        repeated_issues = text(value).length > 0 && text(value) !== "0" ? 1 : 0;
      else if (k.includes("overtime") || k.includes("überstunden") || k === "overtime_hours_week") overtime_hours = v;
      else if (k.includes("support")) support_needed = v;
      else if (k.includes("absence")) absences = v;
      else if (k.includes("late")) late_arrivals = v;
      else if (k.includes("staff_on_duty") || k === "staff_on_duty") staff_on_duty = v;
      else if (k.includes("morale")) {
        const m = text(value).toLowerCase();
        if (m === "good" || m === "neutral" || m === "poor") staff_morale = m;
      } else if (k.includes("staff_complaint")) {
        if (text(value).length > 0) has_staff_issues = true;
      }
    }

    if (occupancy_rate === 0 && negative_feedback === 0) {
      console.warn(
        `[kpi-extractor] No KPIs extracted for report ${reportId}. Fields: ${Object.keys(reportData).join(", ")}`,
      );
    }
  }

  return {
    occupancy_rate,
    positive_feedback,
    negative_feedback,
    unpaid_departures,
    repeated_issues,
    overtime_hours,
    support_needed,
    staff_on_duty,
    absences,
    late_arrivals,
    staff_morale,
    has_staff_issues,
  };
}

export async function extractAndSaveKPIs(
  reportId: string,
  branchId: string,
  periodStart: string,
  periodEnd: string,
  reportData: Record<string, unknown>,
) {
  const { createServiceRoleClient } = await import("@/lib/supabase");
  const supabase = createServiceRoleClient();
  const kpis = extractKPIsFromReportData(reportId, reportData);

  const { error } = await supabase.from("kpis").upsert(
    {
      report_id: reportId,
      branch_id: branchId,
      period_start: periodStart,
      period_end: periodEnd,
      period_type: "daily",
      ...kpis,
    },
    { onConflict: "report_id" },
  );

  if (error) console.error("[kpi-extractor] error:", error);
}
