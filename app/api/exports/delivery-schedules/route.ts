import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api/validate-body";
import { formatDeliveryScheduleCard } from "@/lib/exports/delivery-schedule-labels";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { DAY_OF_WEEK_LABELS } from "@/lib/schedules/dates";
import { createServiceRoleClient } from "@/lib/supabase";

const createScheduleSchema = z.object({
  export_type: z.enum(["weekly", "management", "comparison"]),
  day_of_week: z.number().int().min(0).max(6),
  hour_utc: z.number().int().min(0).max(23),
  branch_ids: z.array(z.string().uuid()).optional().default([]),
  all_branches: z.boolean().optional().default(true),
  is_active: z.boolean().optional().default(true),
});

const deleteSchema = z.object({
  id: z.string().uuid(),
});

function migrationMissing(error: { code?: string; message?: string }) {
  return error.code === "42P01" || error.message?.includes("export_delivery_schedules");
}

export async function GET() {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data: rows, error } = await supabase
      .from("export_delivery_schedules")
      .select("*")
      .eq("user_id", auth.session.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (migrationMissing(error)) {
        return NextResponse.json({ error: "Run migration for export_delivery_schedules" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const schedules = rows ?? [];
    const branchIds = [...new Set(schedules.flatMap((s) => (s.branch_ids as string[]) ?? []))];
    const { data: branches } = branchIds.length
      ? await supabase.from("branches").select("id, name").in("id", branchIds)
      : { data: [] };
    const branchMap = new Map((branches ?? []).map((b) => [b.id as string, String(b.name)]));

    return NextResponse.json({
      schedules: schedules.map((s) => ({
        id: s.id,
        export_type: s.export_type,
        day_of_week: s.day_of_week,
        hour_utc: s.hour_utc,
        branch_ids: s.branch_ids ?? [],
        branch_names: ((s.branch_ids as string[]) ?? []).map((id) => branchMap.get(id) ?? id),
        all_branches: s.all_branches,
        is_active: s.is_active,
        last_sent_at: s.last_sent_at,
        created_at: s.created_at,
        label: formatDeliveryScheduleCard(
          String(s.export_type),
          Number(s.day_of_week),
          Number(s.hour_utc),
          Boolean(s.is_active),
        ),
        day_label: DAY_OF_WEEK_LABELS[Number(s.day_of_week)] ?? `Day ${s.day_of_week}`,
      })),
    });
  } catch (e) {
    console.error("[GET /api/exports/delivery-schedules]", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(createScheduleSchema, raw);
  if (!parsed.ok) return parsed.response;

  const body = parsed.data;
  if (!body.all_branches && body.branch_ids.length === 0) {
    return NextResponse.json({ error: "branch_ids must be non-empty or set all_branches to true" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();

    const { count, error: countErr } = await supabase
      .from("export_delivery_schedules")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.session.id);

    if (countErr) {
      if (migrationMissing(countErr)) {
        return NextResponse.json({ error: "Run migration for export_delivery_schedules" }, { status: 503 });
      }
      return NextResponse.json({ error: countErr.message }, { status: 500 });
    }

    if ((count ?? 0) >= 3) {
      return NextResponse.json({ error: "Maximum of 3 delivery schedules per user" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("export_delivery_schedules")
      .insert({
        user_id: auth.session.id,
        export_type: body.export_type,
        day_of_week: body.day_of_week,
        hour_utc: body.hour_utc,
        branch_ids: body.all_branches ? [] : body.branch_ids,
        all_branches: body.all_branches,
        is_active: body.is_active,
      })
      .select("*")
      .single();

    if (error) {
      if (migrationMissing(error)) {
        return NextResponse.json({ error: "Run migration for export_delivery_schedules" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ schedule: data });
  } catch (e) {
    console.error("[POST /api/exports/delivery-schedules]", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(deleteSchema, raw);
  if (!parsed.ok) return parsed.response;

  try {
    const supabase = createServiceRoleClient();
    const { data: row, error: fetchErr } = await supabase
      .from("export_delivery_schedules")
      .select("id, user_id")
      .eq("id", parsed.data.id)
      .maybeSingle();

    if (fetchErr) {
      if (migrationMissing(fetchErr)) {
        return NextResponse.json({ error: "Run migration for export_delivery_schedules" }, { status: 503 });
      }
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.user_id !== auth.session.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { error } = await supabase.from("export_delivery_schedules").delete().eq("id", parsed.data.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/exports/delivery-schedules]", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
