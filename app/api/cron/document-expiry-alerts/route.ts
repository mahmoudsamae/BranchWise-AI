import { NextResponse } from "next/server";

import { alertTierForDaysLeft, daysUntilExpiry } from "@/lib/cron/document-expiry-alerts";
import { verifyCronRequest } from "@/lib/cron/verify-cron";
import { createServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const supabase = createServiceRoleClient();
    const today = todayDate();

    const { data: docs, error } = await supabase
      .from("staff_documents")
      .select("id, label, expires_at, staff_member_id, last_alert_at, staff_members ( full_name )")
      .not("expires_at", "is", null)
      .gte("expires_at", today);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: hrUsers } = await supabase.from("users").select("id, email, full_name").eq("role", "hr").eq("is_active", true);

    let alerted = 0;
    for (const doc of docs ?? []) {
      if (!doc.expires_at) continue;
      const daysLeft = daysUntilExpiry(doc.expires_at, today);
      const tier = alertTierForDaysLeft(daysLeft);
      if (!tier) continue;

      const lastTier = doc.last_alert_at ? daysUntilExpiry(doc.expires_at, doc.last_alert_at.slice(0, 10)) : null;
      if (lastTier !== null && lastTier <= tier) continue;

      const staff = doc.staff_members as { full_name: string } | null;
      const preview = `${staff?.full_name ?? "Staff"}: "${doc.label}" expires in ${daysLeft} day(s)`;

      for (const hr of hrUsers ?? []) {
        await supabase.from("user_notifications").insert({
          user_id: hr.id,
          type: "document_expiry",
          staff_member_id: doc.staff_member_id,
          preview,
        });
      }

      await supabase
        .from("staff_documents")
        .update({ last_alert_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("id", doc.id);

      alerted += 1;
    }

    return NextResponse.json({ ok: true, alerted, checked: docs?.length ?? 0 });
  } catch {
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
