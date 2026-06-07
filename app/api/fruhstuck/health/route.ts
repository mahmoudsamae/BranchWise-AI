import { NextResponse } from "next/server";

import {
  getBreakfastSupabase,
  isBreakfastSupabaseConfigured,
} from "@/lib/breakfast-supabase";
import { requireGeneralManagerApi } from "@/lib/gm-hr/require-session";

export async function GET() {
  const auth = await requireGeneralManagerApi();
  if (!auth.ok) return auth.response;

  if (!isBreakfastSupabaseConfigured()) {
    return NextResponse.json({
      ready: false,
      source: "breakfast_supabase",
      detail:
        "Add BREAKFAST_SUPABASE_URL and BREAKFAST_SUPABASE_SERVICE_ROLE_KEY (breakfast-order project → Settings → API)",
      hints: process.env.BREAKFAST_DB_URL
        ? [
            "Remove BREAKFAST_DB_URL (Postgres :5432). Use Supabase URL + service_role key instead.",
          ]
        : [],
    });
  }

  try {
    const supabase = getBreakfastSupabase();
    const { error } = await supabase.from("branches").select("id").limit(1);
    return NextResponse.json({
      ready: !error,
      source: "breakfast_supabase",
      detail: error?.message ?? null,
    });
  } catch (e) {
    console.error("[GET /api/fruhstuck/health] error:", e);
    return NextResponse.json({
      ready: false,
      source: "breakfast_supabase",
      detail: e instanceof Error ? e.message : "Connection failed",
    });
  }
}
