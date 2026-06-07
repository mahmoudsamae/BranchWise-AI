import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api/validate-body";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { getTemplateIdsForRole } from "@/lib/hr/requester-filter";
import { nextRunOnOrAfter, todayUtc } from "@/lib/schedules/dates";
import { createServiceRoleClient } from "@/lib/supabase";

const createScheduleSchema = z.object({
  template_id: z.string().uuid("template_id must be a valid UUID"),
  branch_ids: z.array(z.string().uuid()).optional().default([]),
  all_branches: z.boolean().optional().default(false),
  day_of_week: z.number().int().min(0).max(6),
  period_length_days: z.number().int().min(1).max(30).default(7),
  due_after_days: z.number().int().min(1).max(14).default(3),
  is_active: z.boolean().optional().default(true),
});

export async function GET() {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const allowedTemplateIds = await getTemplateIdsForRole(supabase, auth.session.role);
    if (allowedTemplateIds.length === 0) {
      return NextResponse.json({ schedules: [] });
    }

    const { data: rows, error } = await supabase
      .from("recurring_schedules")
      .select("*")
      .in("template_id", allowedTemplateIds)
      .order("next_run_at", { ascending: true, nullsFirst: false });

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ error: "Run migration for recurring_schedules" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const schedules = rows ?? [];
    const templateIds = [...new Set(schedules.map((s) => s.template_id as string))];
    const branchIds = [...new Set(schedules.flatMap((s) => (s.branch_ids as string[]) ?? []))];

    const [{ data: templates }, { data: branches }] = await Promise.all([
      templateIds.length
        ? supabase.from("templates").select("id, title, type").in("id", templateIds)
        : Promise.resolve({ data: [] }),
      branchIds.length
        ? supabase.from("branches").select("id, name").in("id", branchIds)
        : Promise.resolve({ data: [] }),
    ]);

    const tplMap = new Map((templates ?? []).map((t) => [t.id as string, { title: String(t.title), type: String(t.type) }]));
    const branchMap = new Map((branches ?? []).map((b) => [b.id as string, String(b.name)]));

    return NextResponse.json({
      schedules: schedules.map((s) => ({
        id: s.id,
        template_id: s.template_id,
        template_title: tplMap.get(s.template_id as string)?.title ?? "—",
        template_type: tplMap.get(s.template_id as string)?.type ?? "—",
        branch_ids: s.branch_ids ?? [],
        branch_names: ((s.branch_ids as string[]) ?? []).map((id) => branchMap.get(id) ?? id),
        all_branches: s.all_branches,
        day_of_week: s.day_of_week,
        period_length_days: s.period_length_days,
        due_after_days: s.due_after_days,
        is_active: s.is_active,
        created_by: s.created_by,
        created_at: s.created_at,
        last_run_at: s.last_run_at,
        next_run_at: s.next_run_at,
      })),
    });
  } catch (e) {
    console.error("[GET /api/schedules]", e);
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
    const allowedTemplateIds = await getTemplateIdsForRole(supabase, auth.session.role);
    if (!allowedTemplateIds.includes(body.template_id)) {
      return NextResponse.json({ error: "Template not allowed for your role" }, { status: 403 });
    }

    const today = todayUtc();
    const next_run_at = nextRunOnOrAfter(today, body.day_of_week);

    const { data, error } = await supabase
      .from("recurring_schedules")
      .insert({
        template_id: body.template_id,
        branch_ids: body.all_branches ? [] : body.branch_ids,
        all_branches: body.all_branches,
        day_of_week: body.day_of_week,
        period_length_days: body.period_length_days,
        due_after_days: body.due_after_days,
        is_active: body.is_active,
        created_by: auth.session.id,
        next_run_at,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ error: "Run migration for recurring_schedules" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ schedule: data });
  } catch (e) {
    console.error("[POST /api/schedules]", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
