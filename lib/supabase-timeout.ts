/** Fetch wrapper that aborts slow Supabase HTTP calls (avoids hung route handlers). */
export function fetchWithTimeout(timeoutMs = 12_000): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) {
        throw new Error(`Supabase request timed out after ${timeoutMs}ms`);
      }
      throw e;
    } finally {
      clearTimeout(timer);
    }
  };
}

export function isSupabaseTimeoutError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes("timed out") || msg.includes("TimeoutError") || msg.includes("AbortError");
}
