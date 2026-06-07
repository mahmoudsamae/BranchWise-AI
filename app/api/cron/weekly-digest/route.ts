import { NextResponse } from "next/server";

import { buildWeeklyDigest } from "@/lib/email/build-weekly-digest";
import { verifyCronRequest } from "@/lib/cron/verify-cron";
import { sendWeeklyDigestEmail } from "@/lib/email/send-weekly-digest";
import { createServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  try {
    const supabase = createServiceRoleClient();
    const digest = await buildWeeklyDigest(supabase);

    const { data: gms } = await supabase
      .from("users")
      .select("email")
      .eq("role", "general_manager")
      .eq("is_active", true);

    const emails = [...new Set((gms ?? []).map((u) => String(u.email).trim()).filter(Boolean))];

    let sent = 0;
    let skipped = 0;

    if (emails.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 1, digest });
    }

    const results = await Promise.allSettled(
      emails.map((to) => sendWeeklyDigestEmail({ to, digest })),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value === "sent") sent += 1;
      else skipped += 1;
    }

    return NextResponse.json({ sent, skipped, digest });
  } catch (e) {
    console.error("[GET /api/cron/weekly-digest]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
