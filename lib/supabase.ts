import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { fetchWithTimeout } from "@/lib/supabase-timeout";

function requirePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return { url, anonKey };
}

/** Browser / Client Components — Supabase with the anon key. */
export function createClient(): SupabaseClient<Database> {
  const { url, anonKey } = requirePublicEnv();
  return createBrowserClient<Database>(url, anonKey);
}

/**
 * Server Components & Route Handlers — Supabase SSR client (anon key + cookies).
 * Use when you need cookie-based Supabase Auth later; for `public.users` reads use `createServiceRoleClient()`.
 */
export async function createServerClient(): Promise<SupabaseClient<Database>> {
  const { createServerClient } = await import("@supabase/ssr");
  const { cookies } = await import("next/headers");
  const { url, anonKey } = requirePublicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /* Server Components cannot set cookies */
        }
      },
    },
  });
}

/**
 * Server-only reads/writes to `public.users` (bypasses RLS). Requires `SUPABASE_SERVICE_ROLE_KEY` in env.
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  const timeoutMs = Number(process.env.SUPABASE_FETCH_TIMEOUT_MS ?? 12_000);
  return createSupabaseJsClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout(timeoutMs) },
  });
}
