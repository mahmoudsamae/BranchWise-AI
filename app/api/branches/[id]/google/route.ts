import { NextResponse } from "next/server";

import { extractPlaceId, isUnsupportedCidGoogleMapsUrl } from "@/lib/google/extract-place-id";
import { invalidateReviewsCache } from "@/lib/google/reviews-cache";
import { requireGeneralManagerOrSuperAdminApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const auth = await requireGeneralManagerOrSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  let body: { google_maps_url?: string | null };
  try {
    body = (await request.json()) as { google_maps_url?: string | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!("google_maps_url" in body)) {
    return NextResponse.json({ error: "google_maps_url ist erforderlich" }, { status: 400 });
  }

  const rawUrl =
    body.google_maps_url === null || body.google_maps_url === undefined
      ? ""
      : String(body.google_maps_url).trim();

  if (!rawUrl) {
    try {
      const supabase = createServiceRoleClient();
      const { data, error } = await supabase
        .from("branches")
        .update({ google_maps_url: null, google_place_id: null })
        .eq("id", id)
        .select("id, google_maps_url, google_place_id")
        .single();

      if (error) {
        if (error.code === "42703") {
          return NextResponse.json(
            { error: "Datenbank-Migration fehlt — Spalten google_maps_url / google_place_id anlegen." },
            { status: 503 },
          );
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      return NextResponse.json({ branch: data });
    } catch {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
    }
  }

  if (isUnsupportedCidGoogleMapsUrl(rawUrl)) {
    return NextResponse.json(
      {
        error:
          "Links mit ?cid= werden nicht unterstützt. Bitte einen Google-Maps-Link mit Place-ID (ChIJ…) oder die Place-ID direkt einfügen.",
      },
      { status: 400 },
    );
  }

  const placeId = extractPlaceId(rawUrl);
  if (!placeId) {
    return NextResponse.json(
      {
        error:
          "Keine gültige Google Place-ID (ChIJ…) gefunden. Bitte den Teilen-Link von Google Maps verwenden oder die Place-ID direkt einfügen.",
      },
      { status: 400 },
    );
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: existing } = await supabase.from("branches").select("google_place_id").eq("id", id).maybeSingle();

    const { data, error } = await supabase
      .from("branches")
      .update({ google_maps_url: rawUrl, google_place_id: placeId })
      .eq("id", id)
      .select("id, google_maps_url, google_place_id")
      .single();

    if (error) {
      if (error.code === "42703") {
        return NextResponse.json(
          { error: "Datenbank-Migration fehlt — Spalten google_maps_url / google_place_id anlegen." },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (existing?.google_place_id && existing.google_place_id !== placeId) {
      invalidateReviewsCache(existing.google_place_id);
    }

    return NextResponse.json({ branch: data });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
