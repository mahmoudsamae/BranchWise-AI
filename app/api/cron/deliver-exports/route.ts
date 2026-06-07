import { NextResponse } from "next/server";

import {
  deliverExportSchedule,
  isExportScheduleDue,
  type ExportDeliveryScheduleRow,
} from "@/lib/cron/deliver-export-schedule";
import { verifyCronRequest } from "@/lib/cron/verify-cron";
import { createServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  const now = new Date();

  try {
    const supabase = createServiceRoleClient();
    const { data: rows, error } = await supabase.from("export_delivery_schedules").select("*").eq("is_active", true);

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ error: "Run migration for export_delivery_schedules" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const schedules = (rows ?? []) as ExportDeliveryScheduleRow[];
    const due = schedules.filter((s) => isExportScheduleDue(s, now));

    let sent = 0;
    let skipped = 0;
    const errors: { schedule_id: string; error: string }[] = [];

    for (const schedule of due) {
      const result = await deliverExportSchedule(supabase, schedule);
      if (result.ok) {
        sent += 1;
      } else {
        errors.push({ schedule_id: schedule.id, error: result.error });
      }
    }

    skipped = schedules.length - due.length;

    return NextResponse.json({
      checked: schedules.length,
      due: due.length,
      sent,
      skipped,
      errors,
    });
  } catch (e) {
    console.error("[GET /api/cron/deliver-exports]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
