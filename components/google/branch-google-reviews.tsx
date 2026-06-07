"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { GoogleReviewsPanel } from "@/components/google/google-reviews-panel";
import type { GoogleReviewDto, GoogleReviewsAnalytics, GoogleReviewsPayload } from "@/lib/google/places-reviews";

type ReviewsResponse =
  | { configured: false; migrationRequired?: boolean; branchName?: string }
  | {
      configured: true;
      apiConfigured?: false;
      error?: string;
      branchName?: string;
      placeId?: string;
    }
  | ({
      configured: true;
      apiConfigured: true;
      isDemo?: boolean;
      branchName?: string;
    } & GoogleReviewsPayload);

type Props = {
  branchId: string;
};

export function BranchGoogleReviews({ branchId }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/branches/${branchId}/reviews`, { cache: "no-store" });
      const j = (await res.json()) as ReviewsResponse & { error?: string };
      if (!res.ok && "error" in j && j.error) {
        setError(j.error);
        setData(j);
        return;
      }
      setData(j);
    } catch {
      setError("Bewertungen konnten nicht geladen werden.");
    } finally {
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-[#9ca3af]">
        <Loader2 className="size-5 animate-spin" aria-hidden />
        Bewertungen werden geladen…
      </div>
    );
  }

  if (!data || !data.configured) {
    return (
      <div className="rounded-xl border border-[#1f2937] bg-[#111827] p-8 text-center">
        <h2 className="text-lg font-semibold text-white">Google Bewertungen noch nicht eingerichtet</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-[#9ca3af]">
          Bitte in der{" "}
          <Link href="/dashboard/bewertungen" className="text-[#a5b4fc] hover:underline">
            Bewertungen-Zentrale
          </Link>{" "}
          den Google-Maps-Link für diese Filiale hinterlegen.
        </p>
        {data && "migrationRequired" in data && data.migrationRequired ? (
          <p className="mt-4 text-sm text-amber-400">Datenbank-Migration fehlt (google_maps_url / google_place_id).</p>
        ) : null}
      </div>
    );
  }

  if (!("reviews" in data)) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-[#111827] p-8">
        <h2 className="text-lg font-semibold text-white">Google API nicht konfiguriert</h2>
        <p className="mt-3 text-sm text-[#9ca3af]">
          Link in der{" "}
          <Link href="/dashboard/bewertungen" className="text-[#a5b4fc] hover:underline">
            Bewertungen-Zentrale
          </Link>{" "}
          prüfen. API-Schlüssel: Super Admin → Integrationen.
        </p>
        {data.error ? <p className="mt-2 text-sm text-red-400">{data.error}</p> : null}
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        <Button type="button" variant="secondary" className="mt-4" onClick={() => void load()}>
          Erneut versuchen
        </Button>
      </div>
    );
  }

  const payload: GoogleReviewsPayload = {
    placeId: data.placeId,
    displayName: data.displayName,
    rating: data.rating,
    userRatingCount: data.userRatingCount,
    reviews: data.reviews as GoogleReviewDto[],
    analytics: data.analytics as GoogleReviewsAnalytics,
  };

  return <GoogleReviewsPanel payload={payload} isDemo={data.isDemo} onRefresh={() => void load()} />;
}
