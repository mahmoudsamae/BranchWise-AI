import { describe, expect, it } from "vitest";

import { calcHealthScore } from "@/lib/gm-hr/health-score";
import type { BranchKpiRow } from "@/lib/gm-hr/analytics-service";

function branch(overrides: Partial<BranchKpiRow> = {}): BranchKpiRow {
  return {
    branch_id: "b1",
    branch_name: "Test",
    avg_occupancy: 85,
    total_negative_feedback: 0,
    unpaid_departures: 0,
    positive_feedback: 0,
    repeated_issues: 0,
    support_needed: 0,
    reports_submitted: 1,
    occupancy_rate: 85,
    negative_feedback: 0,
    ...overrides,
  };
}

describe("calcHealthScore", () => {
  it("scores highly for strong branches", () => {
    const result = calcHealthScore(branch(), { submissionRate: 1 });
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.grade).toBe("A");
    expect(result.color).toBe("green");
  });

  it("penalizes overdue submissions and negative feedback", () => {
    const result = calcHealthScore(branch({ avg_occupancy: 50, total_negative_feedback: 12 }), {
      submissionRate: 0,
    });
    expect(result.score).toBeLessThan(50);
    expect(result.color).toBe("red");
  });
});
