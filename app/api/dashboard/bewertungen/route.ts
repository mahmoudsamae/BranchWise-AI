import { NextResponse } from "next/server";

import { isGooglePlacesApiKeyConfigured } from "@/lib/google/google-places-api-key";
import { resolveBranchReviews } from "@/lib/google/resolve-branch-reviews";
import { shouldUseMockGoogleReviews } from "@/lib/google/mock-reviews";
import { requireGeneralManagerApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireGeneralManagerApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branch_id");

  try {
    const supabase = createServiceRoleClient();
    let query = supabase
      .from("branches")
      .select("id, name, location, google_maps_url, google_place_id, is_active")
      .eq("is_active", true)
      .order("name");

    if (branchId) query = query.eq("id", branchId);

    const { data: branches, error } = await query;

    if (error) {
      if (error.code === "42703") {
        return NextResponse.json(
          { migrationRequired: true, error: "Datenbank-Migration fehlt.", branches: [] },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const summaries = await Promise.all(
      (branches ?? []).map(async (b) => {
        const resolved = await resolveBranchReviews({
          id: b.id,
          name: b.name,
          google_place_id: b.google_place_id,
        });

        const linked = Boolean(b.google_place_id);
        let rating: number | null = null;
        let userRatingCount: number | null = null;
        let isDemo = false;
        let status: "live" | "demo" | "unlinked" | "error" = linked ? "live" : "unlinked";

        if (resolved.status === "ok") {
          rating = resolved.data.rating;
          userRatingCount = resolved.data.userRatingCount;
          isDemo = resolved.isDemo;
          status = resolved.isDemo ? "demo" : "live";
        } else if (resolved.status === "not_configured") {
          status = shouldUseMockGoogleReviews() ? "demo" : "unlinked";
          if (shouldUseMockGoogleReviews()) {
            const mock = await resolveBranchReviews({ id: b.id, name: b.name, google_place_id: null });
            if (mock.status === "ok") {
              rating = mock.data.rating;
              userRatingCount = mock.data.userRatingCount;
              isDemo = true;
            }
          }
        } else if (resolved.status === "error") {
          status = "error";
        }

        return {
          id: b.id,
          name: b.name,
          location: b.location,
          google_maps_url: b.google_maps_url,
          google_place_id: b.google_place_id,
          linked,
          status,
          isDemo,
          rating,
          userRatingCount,
          error: resolved.status === "error" ? resolved.error : undefined,
          detail:
            branchId && b.id === branchId && resolved.status === "ok"
              ? { reviews: resolved.data.reviews, analytics: resolved.data.analytics, displayName: resolved.data.displayName }
              : undefined,
        };
      }),
    );

    const apiKeyConfigured = await isGooglePlacesApiKeyConfigured();

    return NextResponse.json({
      mockMode: shouldUseMockGoogleReviews(),
      apiKeyConfigured,
      branches: summaries,
    });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
