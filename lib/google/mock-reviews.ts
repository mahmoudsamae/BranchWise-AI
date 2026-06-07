import type { GoogleReviewsPayload } from "@/lib/google/places-reviews";

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const DEMO_AUTHORS = [
  "Thomas M.",
  "Anna K.",
  "Stefan W.",
  "Julia B.",
  "Michael R.",
  "Sarah L.",
  "Markus H.",
  "Laura F.",
];

const DEMO_TEXTS = [
  "Sehr freundliches Team und saubere Anlage. Gerne wieder!",
  "Gute Lage, etwas laut am Wochenende aber insgesamt zufrieden.",
  "Perfekt für Familien — Kinder hatten viel Spaß am Pool.",
  "Check-in war schnell, Unterkunft wie auf den Fotos.",
  "Frühstück könnte etwas vielfältiger sein, Service aber top.",
  "Ruhige Plätze, schöne Umgebung zum Wandern.",
  "Preis-Leistung stimmt, besonders in der Nebensaison.",
  "WLAN im Bungalow war schwach, ansonsten alles gut.",
];

/** Deterministic demo payload per branch for UI preview. */
export function getMockReviewsForBranch(branchId: string, branchName: string): GoogleReviewsPayload & { isDemo: true } {
  const seed = hashSeed(branchId);
  const rating = 3.6 + (seed % 14) / 10;
  const userRatingCount = 45 + (seed % 320);
  const reviewCount = 6 + (seed % 4);

  const reviews = Array.from({ length: reviewCount }, (_, i) => {
    const rSeed = seed + i * 17;
    const stars = Math.min(5, Math.max(1, Math.round(rating + ((rSeed % 7) - 3) * 0.4)));
    const daysAgo = 3 + ((rSeed * 11) % 180);
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return {
      id: `demo-${branchId}-${i}`,
      authorName: DEMO_AUTHORS[rSeed % DEMO_AUTHORS.length]!,
      rating: stars,
      text: DEMO_TEXTS[(rSeed + i) % DEMO_TEXTS.length]!,
      publishTime: d.toISOString(),
      relativeTime: `vor ${daysAgo} Tagen`,
    };
  });

  const byStar: GoogleReviewsPayload["analytics"]["byStar"] = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const r of reviews) {
    const k = String(r.rating) as keyof typeof byStar;
    byStar[k] += 1;
  }

  return {
    isDemo: true,
    placeId: `ChIJ_DEMO_${branchId.slice(0, 8)}`,
    displayName: branchName,
    rating: Math.round(rating * 10) / 10,
    userRatingCount,
    reviews,
    analytics: { byStar },
  };
}

export function shouldUseMockGoogleReviews(): boolean {
  const flag = process.env.GOOGLE_REVIEWS_USE_MOCK?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  return process.env.NODE_ENV !== "production";
}
