import {
  WORKSPACE_SETTING_GOOGLE_PLACES_API_KEY,
  getWorkspaceSetting,
  invalidateWorkspaceSettingCache,
} from "@/lib/settings/workspace-settings";

/** Prefer workspace DB (Super Admin), then optional env fallback for bootstrap. */
export async function getGooglePlacesApiKey(): Promise<string | null> {
  const fromDb = await getWorkspaceSetting(WORKSPACE_SETTING_GOOGLE_PLACES_API_KEY);
  if (fromDb) return fromDb;
  const fromEnv = process.env.GOOGLE_PLACES_API_KEY?.trim();
  return fromEnv || null;
}

export async function isGooglePlacesApiKeyConfigured(): Promise<boolean> {
  return Boolean(await getGooglePlacesApiKey());
}

export function invalidateGooglePlacesApiKeyCache(): void {
  invalidateWorkspaceSettingCache(WORKSPACE_SETTING_GOOGLE_PLACES_API_KEY);
}
