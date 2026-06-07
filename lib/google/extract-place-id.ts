const PLACE_ID_PATTERN = /ChIJ[\w-]+/;

/** Google Maps `cid=` links cannot be resolved to a Places API Place ID. */
export function isUnsupportedCidGoogleMapsUrl(input: string): boolean {
  return /[?&]cid=/i.test(input.trim());
}

/**
 * Extract a Google Place ID (ChIJ…) from a Maps URL or raw input.
 * Returns null for unsupported formats (e.g. cid= links).
 */
export function extractPlaceId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (isUnsupportedCidGoogleMapsUrl(trimmed)) return null;

  if (/^ChIJ[\w-]+$/i.test(trimmed)) return trimmed;

  const match = trimmed.match(PLACE_ID_PATTERN);
  if (match) return match[0];

  const gPage = trimmed.match(/g\.page\/r\/([^/?#]+)/i);
  if (gPage?.[1]) {
    const segment = decodeURIComponent(gPage[1]);
    if (/^ChIJ[\w-]+$/i.test(segment)) return segment;
    const nested = segment.match(PLACE_ID_PATTERN);
    if (nested) return nested[0];
  }

  return null;
}
