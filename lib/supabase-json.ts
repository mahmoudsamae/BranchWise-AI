import type { Json } from "@/lib/database.types";

/** Coerce parsed request/form data into Supabase `jsonb` column values. */
export function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

/** Use `undefined` instead of `null` for optional Supabase insert/update fields. */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}
