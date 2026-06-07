import { NextResponse } from "next/server";

import { verifyCronRequest } from "@/lib/cron/verify-cron";
import { nextRunAfter, todayUtc } from "@/lib/schedules/dates";
import { runRecurringSchedule, type RecurringScheduleRow } from "@/lib/schedules/run-schedule";
import { createServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  const today = todayUtc();

  try {
    const supabase = createServiceRoleClient();

    const { data: due, error } = await supabase
      .from("recurring_schedules")
      .select("*")
      .eq("is_active", true)
      .not("next_run_at", "is", null)
      .lte("next_run_at", today);

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ error: "Run migration for recurring_schedules" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const schedules = (due ?? []) as RecurringScheduleRow[];
    let processed = 0;
    let created = 0;
    const errors: { schedule_id: string; error: string }[] = [];

    for (const schedule of schedules) {
      const runDate = String(schedule.next_run_at ?? today);
      const result = await runRecurringSchedule(supabase, schedule, runDate);

      if (result.error) {
        errors.push({ schedule_id: schedule.id, error: result.error });
        continue;
      }

      created += result.created;
      processed += 1;

      const now = new Date().toISOString();
      const next_run_at = nextRunAfter(runDate, schedule.day_of_week);

      const { error: uErr } = await supabase
        .from("recurring_schedules")
        .update({ last_run_at: now, next_run_at })
        .eq("id", schedule.id);

      if (uErr) {
        errors.push({ schedule_id: schedule.id, error: uErr.message });
      }
    }

    return NextResponse.json({ processed, created, due: schedules.length, errors });
  } catch (e) {
    console.error("[GET /api/cron/run-schedules]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
