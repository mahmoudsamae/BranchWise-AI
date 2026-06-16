/** Google displays ratings to one decimal — match that when checking targets. */
export function displayRating(rating: number): number {
  return Math.round(rating * 10) / 10;
}

/**
 * Minimum count of new 5-star reviews needed so the displayed average rises by `bump`
 * (default +0.1), assuming all new reviews are 5 stars.
 */
export function reviewsNeededForRatingBump(
  currentRating: number,
  currentCount: number,
  options?: { bump?: number; newStarRating?: number; maxSearch?: number },
): number | null {
  const bump = options?.bump ?? 0.1;
  const newStar = options?.newStarRating ?? 5;
  const maxSearch = options?.maxSearch ?? 50_000;

  if (!Number.isFinite(currentRating) || !Number.isFinite(currentCount) || currentCount <= 0) {
    return null;
  }

  const shown = displayRating(currentRating);
  if (shown >= 5) return 0;

  const target = Math.round((shown + bump) * 10) / 10;
  if (target > 5) return null;

  const totalStars = currentRating * currentCount;

  for (let n = 1; n <= maxSearch; n++) {
    const avg = (totalStars + newStar * n) / (currentCount + n);
    if (displayRating(avg) >= target) return n;
  }

  return null;
}

export function formatRatingBumpHint(
  currentRating: number | null,
  currentCount: number | null,
  bump = 0.1,
): string | null {
  if (currentRating == null || currentCount == null || currentCount <= 0) return null;

  const needed = reviewsNeededForRatingBump(currentRating, currentCount, { bump });
  if (needed === null) return null;
  if (needed === 0) return "Höchstbewertung erreicht";

  const bumpLabel = bump.toString().replace(".", ",");
  return `≈ ${needed.toLocaleString("de-DE")} neue 5★-Bewertungen für +${bumpLabel}`;
}
