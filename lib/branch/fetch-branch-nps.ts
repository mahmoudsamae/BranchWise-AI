import {
  computeNpsFromFeedbackCounts,
  computeNpsFromStarRatings,
  type NpsBreakdown,
  type NpsTrendPoint,
} from "@/lib/nps/nps-analytics";
import { resolveBranchReviews } from "@/lib/google/resolve-branch-reviews";
import { createServiceRoleClient } from "@/lib/supabase";

export type BranchNpsAnalytics = {
  google: NpsBreakdown | null;
  berichte: NpsBreakdown;
  combined: NpsBreakdown | null;
  trend: NpsTrendPoint[];
  periodLabel: string;
};

function mergeBreakdowns(a: NpsBreakdown, b: NpsBreakdown): NpsBreakdown {
  const promoters = a.promoters + b.promoters;
  const passives = a.passives + b.passives;
  const detractors = a.detractors + b.detractors;
  const total = promoters + passives + detractors;
  if (total === 0) {
    return { promoters: 0, passives: 0, detractors: 0, total: 0, score: null };
  }
  return {
    promoters,
    passives,
    detractors,
    total,
    score: Math.round(((promoters - detractors) / total) * 100),
  };
}

export async function fetchBranchNpsAnalytics(branchId: string): Promise<BranchNpsAnalytics> {
  const supabase = createServiceRoleClient();

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 84);
  const sinceIso = since.toISOString();

  const { data: kpiRows } = await supabase
    .from("kpis")
    .select("positive_feedback, negative_feedback, period_end, created_at")
    .eq("branch_id", branchId)
    .gte("created_at", sinceIso)
    .order("period_end", { ascending: true });

  let positiveTotal = 0;
  let negativeTotal = 0;
  const trend: NpsTrendPoint[] = [];

  for (const row of kpiRows ?? []) {
    const pos = Number(row.positive_feedback ?? 0);
    const neg = Number(row.negative_feedback ?? 0);
    positiveTotal += pos;
    negativeTotal += neg;

    const weekLabel = row.period_end
      ? new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short" }).format(new Date(`${row.period_end}T12:00:00`))
      : "—";
    trend.push({
      label: weekLabel,
      score: computeNpsFromFeedbackCounts(pos, neg).score,
    });
  }

  const berichte = computeNpsFromFeedbackCounts(positiveTotal, negativeTotal);

  let google: NpsBreakdown | null = null;
  const { data: branch } = await supabase
    .from("branches")
    .select("id, name, google_place_id")
    .eq("id", branchId)
    .maybeSingle();

  if (branch) {
    const resolved = await resolveBranchReviews(branch);
    if (resolved.status === "ok" && resolved.data.reviews.length > 0) {
      google = computeNpsFromStarRatings(resolved.data.reviews.map((r) => r.rating));
    }
  }

  const combined =
    google && berichte.total > 0
      ? mergeBreakdowns(google, berichte)
      : google ?? (berichte.total > 0 ? berichte : null);

  const periodLabel = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(new Date());

  return {
    google,
    berichte,
    combined,
    trend: trend.slice(-8),
    periodLabel,
  };
}

export function demoBranchNpsAnalytics(): BranchNpsAnalytics {
  const google = computeNpsFromStarRatings([5, 5, 4, 5, 3, 5, 4, 5, 5, 2, 5, 4]);
  const berichte = computeNpsFromFeedbackCounts(38, 5);
  return {
    google,
    berichte,
    combined: mergeBreakdowns(google, berichte),
    trend: [
      { label: "KW 18", score: 42 },
      { label: "KW 19", score: 48 },
      { label: "KW 20", score: 55 },
      { label: "KW 21", score: 51 },
      { label: "KW 22", score: 58 },
      { label: "KW 23", score: 62 },
    ],
    periodLabel: "Juni 2026",
  };
}
