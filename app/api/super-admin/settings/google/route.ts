import { NextResponse } from "next/server";

import { invalidateGooglePlacesApiKeyCache } from "@/lib/google/google-places-api-key";
import {
  WORKSPACE_SETTING_GOOGLE_PLACES_API_KEY,
  getWorkspaceSetting,
  maskSecret,
  setWorkspaceSetting,
} from "@/lib/settings/workspace-settings";
import { requireSuperAdminApi } from "@/lib/super-admin/require-session";

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  try {
    const value = await getWorkspaceSetting(WORKSPACE_SETTING_GOOGLE_PLACES_API_KEY);
    const envFallback = Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());

    return NextResponse.json({
      configured: Boolean(value || envFallback),
      source: value ? "database" : envFallback ? "env_fallback" : "none",
      masked: value ? maskSecret(value) : envFallback ? "(aus .env.local)" : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fehler beim Laden";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  let body: { api_key?: string | null };
  try {
    body = (await request.json()) as { api_key?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!("api_key" in body)) {
    return NextResponse.json({ error: "api_key ist erforderlich" }, { status: 400 });
  }

  try {
    const raw = body.api_key === null || body.api_key === undefined ? null : String(body.api_key).trim() || null;
    await setWorkspaceSetting(WORKSPACE_SETTING_GOOGLE_PLACES_API_KEY, raw, auth.session.id);
    invalidateGooglePlacesApiKeyCache();

    const value = await getWorkspaceSetting(WORKSPACE_SETTING_GOOGLE_PLACES_API_KEY);
    return NextResponse.json({
      configured: Boolean(value),
      masked: value ? maskSecret(value) : null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Speichern fehlgeschlagen";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
