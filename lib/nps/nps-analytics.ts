export type NpsBreakdown = {
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  score: number | null;
};

export type NpsTrendPoint = {
  label: string;
  score: number | null;
};

/** Standard NPS from 0–10 scores. */
export function computeNpsFromScores(scores: number[]): NpsBreakdown {
  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const raw of scores) {
    const s = Math.round(raw);
    if (s >= 9) promoters += 1;
    else if (s >= 7) passives += 1;
    else if (s >= 0) detractors += 1;
  }

  return finalizeNps(promoters, passives, detractors);
}

/**
 * Approximate NPS from 1–5 star ratings (common for Google reviews):
 * 5★ promoters · 4★ passives · 1–3★ detractors
 */
export function computeNpsFromStarRatings(ratings: number[]): NpsBreakdown {
  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const raw of ratings) {
    const stars = Math.min(5, Math.max(1, Math.round(raw)));
    if (stars >= 5) promoters += 1;
    else if (stars === 4) passives += 1;
    else detractors += 1;
  }

  return finalizeNps(promoters, passives, detractors);
}

/** Internal guest feedback from weekly reports (positive vs negative mentions). */
export function computeNpsFromFeedbackCounts(positive: number, negative: number): NpsBreakdown {
  const promoters = Math.max(0, positive);
  const detractors = Math.max(0, negative);
  return finalizeNps(promoters, 0, detractors);
}

function finalizeNps(promoters: number, passives: number, detractors: number): NpsBreakdown {
  const total = promoters + passives + detractors;
  if (total === 0) {
    return { promoters: 0, passives: 0, detractors: 0, total: 0, score: null };
  }
  const score = Math.round(((promoters - detractors) / total) * 100);
  return { promoters, passives, detractors, total, score };
}

export function npsScoreTone(score: number | null): "green" | "yellow" | "red" | "gray" {
  if (score == null) return "gray";
  if (score >= 50) return "green";
  if (score >= 0) return "yellow";
  return "red";
}

export function npsScoreLabel(score: number | null): string {
  if (score == null) return "—";
  return score > 0 ? `+${score}` : String(score);
}
