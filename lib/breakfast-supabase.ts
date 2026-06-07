import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Second Supabase client for the external Frühstück (breakfast-order) project.
 * BranchWise uses `lib/supabase.ts` for its own database; this module is the only
 * place that connects to a different Supabase project (BREAKFAST_SUPABASE_* env vars).
 */
export function getBreakfastSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.BREAKFAST_SUPABASE_URL?.trim();
  const key = process.env.BREAKFAST_SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    if (process.env.BREAKFAST_DB_URL) {
      throw new Error(
        "BREAKFAST_DB_URL (Postgres :5432) no longer used. " +
          "Add BREAKFAST_SUPABASE_URL=https://YOUR-REF.supabase.co and " +
          "BREAKFAST_SUPABASE_SERVICE_ROLE_KEY from breakfast-order → Settings → API.",
      );
    }
    throw new Error(
      "Set BREAKFAST_SUPABASE_URL and BREAKFAST_SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

export function isBreakfastSupabaseConfigured(): boolean {
  return Boolean(
    process.env.BREAKFAST_SUPABASE_URL?.trim() &&
      process.env.BREAKFAST_SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}
