import { createServiceRoleClient } from "@/lib/supabase";

export const WORKSPACE_SETTING_GOOGLE_PLACES_API_KEY = "google_places_api_key";

type CacheEntry = { value: string | null; expiresAt: number };

const settingCache = new Map<string, CacheEntry>();
const CACHE_MS = 30_000;

function getCached(key: string): string | null | undefined {
  const hit = settingCache.get(key);
  if (!hit) return undefined;
  if (Date.now() > hit.expiresAt) {
    settingCache.delete(key);
    return undefined;
  }
  return hit.value;
}

function setCache(key: string, value: string | null) {
  settingCache.set(key, { value, expiresAt: Date.now() + CACHE_MS });
}

export function invalidateWorkspaceSettingCache(key?: string) {
  if (key) settingCache.delete(key);
  else settingCache.clear();
}

export async function getWorkspaceSetting(key: string): Promise<string | null> {
  const cached = getCached(key);
  if (cached !== undefined) return cached;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.from("workspace_settings").select("value").eq("key", key).maybeSingle();

    if (error) {
      if (error.code === "42P01") return null;
      console.error("[workspace_settings] read error:", error.message);
      return null;
    }

    const value = data?.value?.trim() || null;
    setCache(key, value);
    return value;
  } catch {
    return null;
  }
}

export async function setWorkspaceSetting(key: string, value: string | null, updatedBy: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const trimmed = value?.trim() || null;

  if (!trimmed) {
    const { error } = await supabase.from("workspace_settings").delete().eq("key", key);
    if (error && error.code !== "42P01") throw new Error(error.message);
    setCache(key, null);
    return;
  }

  const { error } = await supabase.from("workspace_settings").upsert({
    key,
    value: trimmed,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  });

  if (error) {
    if (error.code === "42P01") {
      throw new Error("Datenbank-Migration workspace_settings fehlt.");
    }
    throw new Error(error.message);
  }

  setCache(key, trimmed);
}

export function maskSecret(value: string): string {
  if (value.length <= 8) return "••••••••";
  return `${"•".repeat(Math.min(24, value.length - 4))}${value.slice(-4)}`;
}
