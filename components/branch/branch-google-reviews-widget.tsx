"use client";

import { Star } from "lucide-react";

import { CollapsibleWidget } from "@/components/branch/collapsible-widget";
import type { BranchReviewsSummary } from "@/lib/branch/branch-reviews-summary";

function truncate(text: string, max: number) {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

export function BranchGoogleReviewsWidget({ reviews }: { reviews: BranchReviewsSummary }) {
  return (
    <CollapsibleWidget title="Google Reviews" description="Recent ratings for your branch.">
      {!reviews.linked ? (
        <p className="text-sm text-[#9ca3af]">Google Reviews not connected — contact your manager</p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Star className="size-5 fill-amber-400 text-amber-400" aria-hidden />
            <span className="text-2xl font-bold text-white">{reviews.rating.toFixed(1)}</span>
            <span className="text-sm text-[#9ca3af]">({reviews.userRatingCount} reviews)</span>
          </div>

          <ul className="space-y-3">
            {reviews.recentReviews.slice(0, 2).map((r, i) => (
              <li key={`${r.authorName}-${i}`} className="rounded-lg border border-[#1f2937] bg-[#0a0f1e]/60 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#9ca3af]">
                  <span className="font-medium text-[#e5e7eb]">{r.authorName}</span>
                  <span aria-hidden>·</span>
                  <span>{r.rating.toFixed(1)} ★</span>
                  {r.relativeTime ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{r.relativeTime}</span>
                    </>
                  ) : null}
                </div>
                {r.text ? (
                  <p className="mt-1 text-sm text-[#d1d5db]">{truncate(r.text, 100)}</p>
                ) : (
                  <p className="mt-1 text-sm italic text-[#6b7280]">No comment</p>
                )}
              </li>
            ))}
          </ul>

          {reviews.google_maps_url ? (
            <a
              href={reviews.google_maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex text-sm font-medium text-[#a5b4fc] hover:text-[#c7d2fe]"
            >
              See all on Google Maps ↗
            </a>
          ) : null}
        </div>
      )}
    </CollapsibleWidget>
  );
}
