import { getGooglePlacesApiKey, isGooglePlacesApiKeyConfigured } from "@/lib/google/google-places-api-key";
import { getCachedReviews, setCachedReviews } from "@/lib/google/reviews-cache";

export { isGooglePlacesApiKeyConfigured };

export type GoogleReviewDto = {
  id: string;
  authorName: string;
  rating: number;
  text: string;
  publishTime: string | null;
  relativeTime: string | null;
};

export type GoogleReviewsAnalytics = {
  byStar: Record<"1" | "2" | "3" | "4" | "5", number>;
};

export type GoogleReviewsPayload = {
  placeId: string;
  displayName: string | null;
  rating: number | null;
  userRatingCount: number | null;
  reviews: GoogleReviewDto[];
  analytics: GoogleReviewsAnalytics;
};

type PlacesApiReview = {
  name?: string;
  rating?: number;
  text?: { text?: string };
  publishTime?: string;
  relativePublishTimeDescription?: string;
  authorAttribution?: { displayName?: string };
};

type PlacesApiPlace = {
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  reviews?: PlacesApiReview[];
};

function buildAnalytics(reviews: GoogleReviewDto[]): GoogleReviewsAnalytics {
  const byStar: GoogleReviewsAnalytics["byStar"] = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const r of reviews) {
    const n = Math.min(5, Math.max(1, Math.round(r.rating)));
    const star = String(n) as keyof typeof byStar;
    byStar[star] += 1;
  }
  return { byStar };
}

function mapReviews(raw: PlacesApiReview[] | undefined): GoogleReviewDto[] {
  return (raw ?? []).map((r, index) => ({
    id: r.name ?? `review-${index}`,
    authorName: r.authorAttribution?.displayName?.trim() || "Anonym",
    rating: typeof r.rating === "number" ? r.rating : 0,
    text: r.text?.text?.trim() ?? "",
    publishTime: r.publishTime ?? null,
    relativeTime: r.relativePublishTimeDescription ?? null,
  }));
}

export async function fetchGooglePlaceReviews(
  placeId: string,
): Promise<{ ok: true; data: GoogleReviewsPayload } | { ok: false; error: string; code?: string }> {
  const cached = getCachedReviews<GoogleReviewsPayload>(placeId);
  if (cached) return { ok: true, data: cached };

  const apiKey = await getGooglePlacesApiKey();
  if (!apiKey) {
    return {
      ok: false,
      error: "Google Places API-Schlüssel fehlt — Super Admin → Integrationen.",
      code: "missing_api_key",
    };
  }

  const resourceName = placeId.startsWith("places/") ? placeId : `places/${placeId}`;
  const url = `https://places.googleapis.com/v1/${encodeURIComponent(resourceName)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,reviews",
      },
    });
  } catch {
    return { ok: false, error: "Verbindung zu Google Places fehlgeschlagen." };
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    const msg = body?.error?.message ?? `Google Places API Fehler (${res.status})`;
    return { ok: false, error: msg };
  }

  const place = (await res.json()) as PlacesApiPlace;
  const reviews = mapReviews(place.reviews);
  const data: GoogleReviewsPayload = {
    placeId,
    displayName: place.displayName?.text ?? null,
    rating: typeof place.rating === "number" ? place.rating : null,
    userRatingCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    reviews,
    analytics: buildAnalytics(reviews),
  };

  setCachedReviews(placeId, data);
  return { ok: true, data };
}
