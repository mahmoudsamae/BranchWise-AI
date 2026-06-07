import { resolveBranchReviews } from "@/lib/google/resolve-branch-reviews";
import { createServiceRoleClient } from "@/lib/supabase";

export type BranchReviewSnippet = {
  authorName: string;
  rating: number;
  text: string;
  relativeTime: string | null;
};

export type BranchReviewsSummary =
  | { linked: false }
  | {
      linked: true;
      rating: number;
      userRatingCount: number;
      recentReviews: BranchReviewSnippet[];
      google_maps_url: string | null;
    };

export async function getBranchReviewsSummary(branchId: string): Promise<BranchReviewsSummary> {
  const supabase = createServiceRoleClient();
  const { data: branch, error } = await supabase
    .from("branches")
    .select("id, name, google_place_id, google_maps_url")
    .eq("id", branchId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!branch) throw new Error("Branch not found");

  if (!branch.google_place_id) {
    return { linked: false };
  }

  const resolved = await resolveBranchReviews(branch);
  if (resolved.status !== "ok") {
    return { linked: false };
  }

  const { rating, userRatingCount, reviews } = resolved.data;

  return {
    linked: true,
    rating: rating ?? 0,
    userRatingCount: userRatingCount ?? 0,
    recentReviews: reviews.slice(0, 3).map((r) => ({
      authorName: r.authorName,
      rating: r.rating,
      text: r.text,
      relativeTime: r.relativeTime,
    })),
    google_maps_url: branch.google_maps_url ?? null,
  };
}
