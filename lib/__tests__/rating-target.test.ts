import { describe, expect, it } from "vitest";

import { displayRating, reviewsNeededForRatingBump } from "@/lib/google/rating-target";

describe("reviewsNeededForRatingBump", () => {
  it("returns null without rating data", () => {
    expect(reviewsNeededForRatingBump(4.5, 0)).toBeNull();
  });

  it("returns 0 at displayed 5.0", () => {
    expect(reviewsNeededForRatingBump(5, 120)).toBe(0);
  });

  it("computes reviews for +0.1 at 4.6 / 100", () => {
    const n = reviewsNeededForRatingBump(4.6, 100);
    expect(n).toBe(15);
    const avg = (4.6 * 100 + 5 * n!) / (100 + n!);
    expect(displayRating(avg)).toBeGreaterThanOrEqual(4.7);
  });

  it("computes reviews for +0.1 at 4.5 / 50", () => {
    const n = reviewsNeededForRatingBump(4.5, 50);
    expect(n).toBe(6);
    const avg = (4.5 * 50 + 5 * n!) / (50 + n!);
    expect(displayRating(avg)).toBeGreaterThanOrEqual(4.6);
  });
});
