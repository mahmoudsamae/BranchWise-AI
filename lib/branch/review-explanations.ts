import crypto from "crypto";

import { getBranchReviewsSummary } from "@/lib/branch/branch-reviews-summary";
import { createServiceRoleClient } from "@/lib/supabase";

export type ReviewNeedingReply = {
  signature: string;
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string | null;
  explanation: string | null;
  explained: boolean;
};

export type ReviewsNeedingReplyPayload = {
  linked: boolean;
  overallRating: number;
  userRatingCount: number;
  googleMapsUrl: string | null;
  reviews: ReviewNeedingReply[];
};

const NEEDS_REPLY_RATING_THRESHOLD = 3;

export function signatureFor(authorName: string, rating: number, text: string): string {
  const normalized = `${authorName.trim().toLowerCase()}|${rating}|${text.trim().toLowerCase()}`;
  return crypto.createHash("sha1").update(normalized).digest("hex");
}

export async function listReviewsNeedingReply(branchId: string): Promise<ReviewsNeedingReplyPayload> {
  const summary = await getBranchReviewsSummary(branchId);
  if (!summary.linked) {
    return { linked: false, overallRating: 0, userRatingCount: 0, googleMapsUrl: null, reviews: [] };
  }

  const lowRated = summary.recentReviews.filter((r) => r.rating <= NEEDS_REPLY_RATING_THRESHOLD);
  if (lowRated.length === 0) {
    return {
      linked: true,
      overallRating: summary.rating,
      userRatingCount: summary.userRatingCount,
      googleMapsUrl: summary.google_maps_url,
      reviews: [],
    };
  }

  const lowRatedWithSignature = lowRated.map((r) => ({ ...r, signature: signatureFor(r.authorName, r.rating, r.text) }));
  const signatures = lowRatedWithSignature.map((r) => r.signature);
  const supabase = createServiceRoleClient();
  const { data: existing } = await supabase
    .from("branch_review_explanations")
    .select("review_signature, explanation")
    .eq("branch_id", branchId)
    .in("review_signature", signatures);

  const explanationMap = new Map((existing ?? []).map((e) => [e.review_signature, e.explanation]));

  const reviews: ReviewNeedingReply[] = lowRatedWithSignature.map(({ signature, ...r }) => {
    const explanation = explanationMap.get(signature) ?? null;
    return {
      signature,
      authorName: r.authorName,
      rating: r.rating,
      text: r.text,
      relativeTime: r.relativeTime,
      explanation,
      explained: Boolean(explanation && explanation.trim()),
    };
  });

  reviews.sort((a, b) => Number(a.explained) - Number(b.explained));

  return {
    linked: true,
    overallRating: summary.rating,
    userRatingCount: summary.userRatingCount,
    googleMapsUrl: summary.google_maps_url,
    reviews,
  };
}

export async function submitExplanation(
  branchId: string,
  userId: string,
  input: { signature: string; authorName: string; rating: number; text: string; explanation: string },
): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("branch_review_explanations").upsert(
    {
      branch_id: branchId,
      review_signature: input.signature,
      author_name: input.authorName,
      rating: input.rating,
      review_text: input.text,
      explanation: input.explanation,
      created_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "branch_id,review_signature" },
  );

  if (error) throw new Error(error.message);
}
