import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api/validate-body";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { getTemplateIdsForRole } from "@/lib/hr/requester-filter";
import { nextRunOnOrAfter, todayUtc } from "@/lib/schedules/dates";
import { createServiceRoleClient } from "@/lib/supabase";

const patchScheduleSchema = z
  .object({
    is_active: z.boolean().optional(),
    day_of_week: z.number().int().min(0).max(6).optional(),
    period_length_days: z.number().int().min(1).max(30).optional(),
    due_after_days: z.number().int().min(1).max(14).optional(),
    all_branches: z.boolean().optional(),
    branch_ids: z.array(z.string().uuid()).optional(),
    template_id: z.string().uuid().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

type Ctx = { params: Promise<{ id: string }> };

async function scheduleAllowed(
  supabase: ReturnType<typeof createServiceRoleClient>,
  scheduleId: string,
  role: Parameters<typeof getTemplateIdsForRole>[1],
) {
  const allowedTemplateIds = await getTemplateIdsForRole(supabase, role);
  const { data: row } = await supabase.from("recurring_schedules").select("id, template_id").eq("id", scheduleId).maybeSingle();
  if (!row) return { ok: false as const, status: 404 as const };
  if (!allowedTemplateIds.includes(row.template_id as string)) {
    return { ok: false as const, status: 403 as const };
  }
  return { ok: true as const, row };
}

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(patchScheduleSchema, raw);
  if (!parsed.ok) return parsed.response;

  try {
    const supabase = createServiceRoleClient();
    const access = await scheduleAllowed(supabase, id, auth.session.role);
    if (!access.ok) {
      return NextResponse.json({ error: access.status === 404 ? "Not found" : "Forbidden" }, { status: access.status });
    }

    const patch: {
      is_active?: boolean;
      day_of_week?: number;
      period_length_days?: number;
      due_after_days?: number;
      all_branches?: boolean;
      branch_ids?: string[];
      template_id?: string;
      next_run_at?: string;
    } = { ...parsed.data };
    if (parsed.data.template_id) {
      const allowed = await getTemplateIdsForRole(supabase, auth.session.role);
      if (!allowed.includes(parsed.data.template_id)) {
        return NextResponse.json({ error: "Template not allowed for your role" }, { status: 403 });
      }
    }

    if (parsed.data.all_branches === true) {
      patch.branch_ids = [];
    }

    if (parsed.data.day_of_week !== undefined) {
      patch.next_run_at = nextRunOnOrAfter(todayUtc(), parsed.data.day_of_week);
    }

    const { data, error } = await supabase.from("recurring_schedules").update(patch).eq("id", id).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ schedule: data });
  } catch (e) {
    console.error("[PATCH /api/schedules/[id]]", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const access = await scheduleAllowed(supabase, id, auth.session.role);
    if (!access.ok) {
      return NextResponse.json({ error: access.status === 404 ? "Not found" : "Forbidden" }, { status: access.status });
    }

    const { error } = await supabase.from("recurring_schedules").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[DELETE /api/schedules/[id]]", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
