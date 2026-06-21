import { describe, expect, it } from "vitest";

import {
  computeNpsFromFeedbackCounts,
  computeNpsFromScores,
  computeNpsFromStarRatings,
} from "@/lib/nps/nps-analytics";

describe("computeNpsFromScores", () => {
  it("returns null score for empty input", () => {
    expect(computeNpsFromScores([]).score).toBeNull();
  });

  it("computes classic NPS", () => {
    const r = computeNpsFromScores([10, 9, 8, 7, 6, 5]);
    expect(r.promoters).toBe(2);
    expect(r.passives).toBe(2);
    expect(r.detractors).toBe(2);
    expect(r.score).toBe(0);
  });
});

describe("computeNpsFromStarRatings", () => {
  it("maps 5★ to promoters and 1–3★ to detractors", () => {
    const r = computeNpsFromStarRatings([5, 5, 4, 1]);
    expect(r.promoters).toBe(2);
    expect(r.passives).toBe(1);
    expect(r.detractors).toBe(1);
    expect(r.score).toBe(25);
  });
});

describe("computeNpsFromFeedbackCounts", () => {
  it("derives NPS from positive vs negative report counts", () => {
    expect(computeNpsFromFeedbackCounts(38, 5).score).toBe(77);
  });
});
