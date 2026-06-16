import { formatRatingBumpHint } from "@/lib/google/rating-target";

export function RatingBumpHint({
  rating,
  count,
  className = "text-xs text-amber-300/90",
}: {
  rating: number | null;
  count: number | null;
  className?: string;
}) {
  const hint = formatRatingBumpHint(rating, count);
  if (!hint) return null;

  const isMax = hint === "Höchstbewertung erreicht";

  return (
    <p className={isMax ? "text-xs text-emerald-300/90" : className}>
      {isMax ? hint : <span>{hint}</span>}
    </p>
  );
}
