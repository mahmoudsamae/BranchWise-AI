import { getMockReviewsForBranch, shouldUseMockGoogleReviews } from "@/lib/google/mock-reviews";
import { isGooglePlacesApiKeyConfigured } from "@/lib/google/google-places-api-key";
import { fetchGooglePlaceReviews } from "@/lib/google/places-reviews";
import type { GoogleReviewsPayload } from "@/lib/google/places-reviews";

export type BranchReviewsResult =
  | { status: "not_configured"; branchName: string; branchId: string }
  | { status: "migration_required" }
  | { status: "error"; branchName: string; branchId: string; error: string }
  | {
      status: "ok";
      branchName: string;
      branchId: string;
      isDemo: boolean;
      placeId: string | null;
      data: GoogleReviewsPayload;
    };

type BranchRow = {
  id: string;
  name: string;
  google_place_id: string | null;
};

export async function resolveBranchReviews(branch: BranchRow): Promise<BranchReviewsResult> {
  const useMock = shouldUseMockGoogleReviews();

  if (!branch.google_place_id) {
    if (useMock) {
      const mock = getMockReviewsForBranch(branch.id, branch.name);
      return {
        status: "ok",
        branchName: branch.name,
        branchId: branch.id,
        isDemo: true,
        placeId: null,
        data: mock,
      };
    }
    return { status: "not_configured", branchName: branch.name, branchId: branch.id };
  }

  if (!(await isGooglePlacesApiKeyConfigured())) {
    if (useMock) {
      const mock = getMockReviewsForBranch(branch.id, branch.name);
      return {
        status: "ok",
        branchName: branch.name,
        branchId: branch.id,
        isDemo: true,
        placeId: branch.google_place_id,
        data: { ...mock, placeId: branch.google_place_id },
      };
    }
    return {
      status: "error",
      branchName: branch.name,
      branchId: branch.id,
      error: "Google Places API-Schlüssel fehlt — Super Admin → Integrationen.",
    };
  }

  const result = await fetchGooglePlaceReviews(branch.google_place_id);
  if (!result.ok) {
    if (useMock) {
      const mock = getMockReviewsForBranch(branch.id, branch.name);
      return {
        status: "ok",
        branchName: branch.name,
        branchId: branch.id,
        isDemo: true,
        placeId: branch.google_place_id,
        data: { ...mock, placeId: branch.google_place_id },
      };
    }
    return { status: "error", branchName: branch.name, branchId: branch.id, error: result.error };
  }

  return {
    status: "ok",
    branchName: branch.name,
    branchId: branch.id,
    isDemo: false,
    placeId: branch.google_place_id,
    data: result.data,
  };
}
