const TTL_MS = 60 * 60 * 1000;

type CacheEntry<T> = { value: T; expiresAt: number };

const store = new Map<string, CacheEntry<unknown>>();

export function getCachedReviews<T>(placeId: string): T | null {
  const hit = store.get(placeId);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    store.delete(placeId);
    return null;
  }
  return hit.value as T;
}

export function setCachedReviews<T>(placeId: string, value: T): void {
  store.set(placeId, { value, expiresAt: Date.now() + TTL_MS });
}

export function invalidateReviewsCache(placeId: string): void {
  store.delete(placeId);
}
