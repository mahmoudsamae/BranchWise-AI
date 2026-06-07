"use client";

import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/Button";
import type { GoogleReviewDto, GoogleReviewsAnalytics, GoogleReviewsPayload } from "@/lib/google/places-reviews";

type SortMode = "newest" | "highest" | "lowest";

const STAR_COLORS: Record<string, string> = {
  "5": "#22c55e",
  "4": "#84cc16",
  "3": "#eab308",
  "2": "#f97316",
  "1": "#ef4444",
};

const TEXT_PREVIEW_LEN = 220;

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex gap-0.5 text-amber-400" aria-label={`${rating} von 5 Sternen`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`size-4 ${i <= full ? "fill-amber-400" : "fill-none opacity-30"}`} aria-hidden />
      ))}
    </span>
  );
}

function formatReviewDate(publishTime: string | null): string {
  if (!publishTime) return "—";
  try {
    return new Date(publishTime).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function ReviewCard({ review }: { review: GoogleReviewDto }) {
  const [expanded, setExpanded] = useState(false);
  const long = review.text.length > TEXT_PREVIEW_LEN;
  const shown = expanded || !long ? review.text : `${review.text.slice(0, TEXT_PREVIEW_LEN)}…`;

  return (
    <article className="rounded-lg border border-[#1f2937] bg-[#0a0f1e]/50 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-white">{review.authorName}</p>
        <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
          <Stars rating={review.rating} />
          <span>{formatReviewDate(review.publishTime)}</span>
          {review.relativeTime ? <span className="text-xs">({review.relativeTime})</span> : null}
        </div>
      </div>
      {review.text ? (
        <p className="mt-2 text-sm leading-relaxed text-[#d1d5db]">
          {shown}
          {long ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="ml-1 text-[#a5b4fc] hover:underline"
            >
              {expanded ? "Weniger anzeigen" : "Mehr anzeigen"}
            </button>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-sm italic text-[#6b7280]">Kein Bewertungstext</p>
      )}
    </article>
  );
}

export type GoogleReviewsPanelProps = {
  payload: GoogleReviewsPayload;
  isDemo?: boolean;
  onRefresh?: () => void;
  compact?: boolean;
};

export function GoogleReviewsPanel({ payload, isDemo, onRefresh, compact }: GoogleReviewsPanelProps) {
  const [sort, setSort] = useState<SortMode>("newest");

  const sortedReviews = useMemo(() => {
    const list = [...payload.reviews];
    if (sort === "newest") {
      list.sort((a, b) => {
        const ta = a.publishTime ? new Date(a.publishTime).getTime() : 0;
        const tb = b.publishTime ? new Date(b.publishTime).getTime() : 0;
        return tb - ta;
      });
    } else if (sort === "highest") {
      list.sort((a, b) => b.rating - a.rating);
    } else {
      list.sort((a, b) => a.rating - b.rating);
    }
    return list;
  }, [payload.reviews, sort]);

  const chartData = useMemo(() => {
    return (["5", "4", "3", "2", "1"] as const).map((star) => ({
      star: `${star} ★`,
      count: payload.analytics.byStar[star],
      fill: STAR_COLORS[star],
    }));
  }, [payload.analytics]);

  return (
    <div className="space-y-8">
      {isDemo ? (
        <p className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-200">
          <strong>Demo-Vorschau:</strong> Beispieldaten zur Ansicht. Pro Filiale den Google-Link unter „Einstellungen“
          speichern; API-Schlüssel legt der Super Admin unter „Integrationen“ an.
        </p>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          {payload.displayName ? <p className="text-sm text-[#9ca3af]">{payload.displayName}</p> : null}
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <p className={compact ? "text-4xl font-bold text-white" : "text-5xl font-bold text-white"}>
              {payload.rating != null ? payload.rating.toFixed(1) : "—"}
            </p>
            <div>
              {payload.rating != null ? <Stars rating={payload.rating} /> : null}
              <p className="mt-1 text-sm text-[#9ca3af]">
                {payload.userRatingCount != null
                  ? `${payload.userRatingCount.toLocaleString("de-DE")} Bewertungen auf Google`
                  : "Keine Gesamtbewertung verfügbar"}
              </p>
            </div>
          </div>
        </div>
        {onRefresh ? (
          <Button type="button" variant="secondary" size="sm" onClick={onRefresh}>
            Aktualisieren
          </Button>
        ) : null}
      </div>

      <section className="rounded-xl border border-[#1f2937] bg-[#111827] p-4">
        <h2 className="mb-4 text-lg font-semibold text-white">Sterneverteilung</h2>
        <div className={compact ? "h-56" : "h-72"}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid stroke="#1f2937" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="star" tick={{ fill: "#9ca3af", fontSize: 12 }} width={48} />
              <Tooltip
                contentStyle={{ background: "#111827", border: "1px solid #1f2937" }}
                formatter={(value) => [`${value ?? 0} Bewertungen`, "Anzahl"]}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.star} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Rezensionen</h2>
          <label className="text-sm text-[#9ca3af]">
            Sortierung{" "}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="ml-2 rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-2 py-1.5 text-sm text-white"
            >
              <option value="newest">Neueste zuerst</option>
              <option value="highest">Beste zuerst</option>
              <option value="lowest">Schlechteste zuerst</option>
            </select>
          </label>
        </div>

        {sortedReviews.length === 0 ? (
          <p className="text-sm text-[#6b7280]">Keine Rezensionen verfügbar.</p>
        ) : (
          <ul className="space-y-3">
            {sortedReviews.map((r) => (
              <li key={r.id}>
                <ReviewCard review={r} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
