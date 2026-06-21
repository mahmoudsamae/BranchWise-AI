import { afterEach, describe, expect, it, vi } from "vitest";

import { HR_FIELD_IDS } from "@/lib/hr/default-template";
import { extractKPIsFromReportData } from "@/lib/kpi-extractor";

describe("extractKPIsFromReportData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("extracts HR template fields by explicit field IDs", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = extractKPIsFromReportData("report-hr", {
      [HR_FIELD_IDS.staffSummary]: "All shifts covered",
      [HR_FIELD_IDS.totalOvertime]: "12.5",
      [HR_FIELD_IDS.totalAbsences]: "2",
      [HR_FIELD_IDS.totalLateArrivals]: "1",
      [HR_FIELD_IDS.staffIssues]: "Scheduling conflict on Friday",
      [HR_FIELD_IDS.teamMorale]: "good",
      [HR_FIELD_IDS.supportNeeded]: "Need extra coverage next week",
    });

    expect(result.overtime_hours).toBe(12.5);
    expect(result.absences).toBe(2);
    expect(result.late_arrivals).toBe(1);
    expect(result.has_staff_issues).toBe(true);
    expect(result.repeated_issues).toBe(1);
    expect(result.staff_morale).toBe("good");
    expect(result.support_needed).toBe(1);
    expect(result.occupancy_rate).toBe(0);
    expect(result.negative_feedback).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it("extracts legacy staff fields by known keys", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = extractKPIsFromReportData("report-legacy", {
      staff_on_duty: "8",
      absences_today: "1",
      late_arrivals: "3",
      overtime_hours_week: "4.5",
      staff_complaints: "",
      staff_morale: "neutral",
      support_needed_hq: "",
    });

    expect(result.staff_on_duty).toBe(8);
    expect(result.absences).toBe(1);
    expect(result.late_arrivals).toBe(3);
    expect(result.overtime_hours).toBe(4.5);
    expect(result.staff_morale).toBe("neutral");
    expect(result.has_staff_issues).toBe(false);
    expect(result.support_needed).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it("returns zeros and warns for unknown fields in legacy fallback", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = extractKPIsFromReportData("report-unknown", {
      custom_field_a: "100",
      random_metric: "42",
    });

    expect(result.overtime_hours).toBe(0);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(
      "[kpi-extractor] No KPIs extracted for report report-unknown. Fields: custom_field_a, random_metric",
    );
  });
});
