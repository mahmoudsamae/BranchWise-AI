"use client";



import { TrendingUp } from "lucide-react";



import { CollapsibleWidget } from "@/components/branch/collapsible-widget";

import { cn } from "@/lib/cn";

import type { BranchNpsAnalytics } from "@/lib/branch/fetch-branch-nps";

import type { NpsBreakdown } from "@/lib/nps/nps-analytics";

import { npsScoreLabel, npsScoreTone } from "@/lib/nps/nps-analytics";



const TONE_CLASS = {

  green: "text-emerald-400",

  yellow: "text-amber-400",

  red: "text-red-400",

  gray: "text-[#6b7280]",

} as const;



const SCORE_FOOTNOTE = "NPS-ähnlicher Index";



function NpsScoreRing({ score, label }: { score: number | null; label: string }) {

  const tone = npsScoreTone(score);

  return (

    <div className="rounded-xl border border-[#1f2937] bg-[#0a0f1e]/60 p-4 text-center">

      <p className="text-[10px] font-medium uppercase tracking-wide text-[#6b7280]">{label}</p>

      <p className={cn("mt-1 text-3xl font-bold tabular-nums", TONE_CLASS[tone])}>{npsScoreLabel(score)}</p>

      <p className="mt-0.5 text-[10px] text-[#6b7280]">{SCORE_FOOTNOTE}</p>

    </div>

  );

}



function BreakdownBar({ breakdown }: { breakdown: NpsBreakdown }) {

  if (breakdown.total === 0) {

    return <p className="text-xs text-[#6b7280]">Keine Daten</p>;

  }

  const pPct = Math.round((breakdown.promoters / breakdown.total) * 100);

  const paPct = Math.round((breakdown.passives / breakdown.total) * 100);

  const dPct = 100 - pPct - paPct;



  return (

    <div className="space-y-2">

      <div className="flex h-2 overflow-hidden rounded-full">

        <span className="bg-emerald-500" style={{ width: `${pPct}%` }} title="Zufrieden" />

        <span className="bg-amber-400" style={{ width: `${paPct}%` }} title="Neutral" />

        <span className="bg-red-500" style={{ width: `${Math.max(0, dPct)}%` }} title="Unzufrieden" />

      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#9ca3af]">

        <span>

          <span className="text-emerald-400">{breakdown.promoters}</span> Zufrieden

        </span>

        <span>

          <span className="text-amber-400">{breakdown.passives}</span> Neutral

        </span>

        <span>

          <span className="text-red-400">{breakdown.detractors}</span> Unzufrieden

        </span>

      </div>

    </div>

  );

}



function TrendSparkline({ trend }: { trend: BranchNpsAnalytics["trend"] }) {

  if (trend.length === 0) return null;

  const scores = trend.map((t) => t.score ?? 0);

  const max = Math.max(...scores, 1);

  const min = Math.min(...scores, 0);

  const range = Math.max(max - min, 1);



  return (

    <div>

      <p className="mb-2 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[#6b7280]">

        <TrendingUp className="size-3" /> Trend (Berichte)

      </p>

      <div className="flex h-12 items-end gap-1">

        {trend.map((point) => {

          const h = point.score == null ? 4 : Math.max(8, ((point.score - min) / range) * 100);

          return (

            <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">

              <div

                className="w-full rounded-t bg-indigo-500/60"

                style={{ height: `${h}%` }}

                title={`${point.label}: ${npsScoreLabel(point.score)}`}

              />

              <span className="truncate text-[8px] text-[#6b7280]">{point.label}</span>

            </div>

          );

        })}

      </div>

    </div>

  );

}



export function BranchNpsAnalyticsWidget({ nps }: { nps: BranchNpsAnalytics }) {

  const headline = nps.combined ?? nps.google ?? nps.berichte;

  const hasData = headline.total > 0 || nps.google != null;



  return (

    <CollapsibleWidget

      title="Gästezufriedenheit"

      description={`NPS-ähnlicher Index · ${nps.periodLabel}`}

      defaultOpen

    >

      {!hasData ? (

        <p className="text-sm text-[#9ca3af]">

          Noch keine Daten — Google verknüpfen oder Wochenberichte mit Gästefeedback einreichen.

        </p>

      ) : (

        <div className="space-y-5">

          <div className="grid gap-3 sm:grid-cols-3">

            <NpsScoreRing score={headline.score} label="Gesamt" />

            <NpsScoreRing score={nps.google?.score ?? null} label="Google" />

            <NpsScoreRing score={nps.berichte.score} label="Berichte" />

          </div>



          <div>

            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[#6b7280]">Verteilung (Gesamt)</p>

            <BreakdownBar breakdown={headline} />

          </div>



          <TrendSparkline trend={nps.trend} />



          <p className="text-[10px] leading-relaxed text-[#6b7280]">

            Annäherung an NPS (kein klassischer 0–10-Umfrage-NPS): Google-Sterne als Proxy · Berichte: positives vs.

            negatives Gästefeedback. Formel: Zufrieden − Unzufrieden (in %).

          </p>

        </div>

      )}

    </CollapsibleWidget>

  );

}


