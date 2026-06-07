import type { SupabaseClient } from "@supabase/supabase-js";

import { addDays } from "@/lib/schedules/dates";

export async function resolveBranchIds(
  supabase: SupabaseClient,
  allBranches: boolean,
  branchIds: string[],
): Promise<string[]> {
  if (allBranches) {
    const { data, error } = await supabase.from("branches").select("id").eq("is_active", true).order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((b) => b.id as string);
  }
  return branchIds.filter(Boolean);
}

export async function createReportRequestsForBranches(
  supabase: SupabaseClient,
  opts: {
    templateId: string;
    branchIds: string[];
    periodStart: string;
    periodEnd: string;
    dueDate: string;
    requestedBy: string;
    title?: string;
  },
): Promise<{ created: number; error?: string }> {
  if (opts.branchIds.length === 0) {
    return { created: 0, error: "No branches found" };
  }

  const { data: tpl, error: tErr } = await supabase
    .from("templates")
    .select("id, title, type")
    .eq("id", opts.templateId)
    .maybeSingle();

  if (tErr) return { created: 0, error: tErr.message };
  if (!tpl) return { created: 0, error: "Template not found" };

  const baseTitle =
    opts.title?.trim() || `${tpl.title} — ${opts.periodStart} → ${opts.periodEnd}`;
  const requestType = typeof tpl.type === "string" && tpl.type.trim() ? tpl.type.trim() : "standard";
  const now = new Date().toISOString();

  const rows = opts.branchIds.map((branch_id) => ({
    branch_id,
    template_id: opts.templateId,
    title: baseTitle,
    request_type: requestType,
    period_start: opts.periodStart,
    period_end: opts.periodEnd,
    due_date: opts.dueDate,
    status: "pending" as const,
    requested_by: opts.requestedBy,
    updated_at: now,
  }));

  const { data: created, error } = await supabase.from("report_requests").insert(rows).select("id");
  if (error) return { created: 0, error: error.message };

  return { created: created?.length ?? 0 };
}

export type RecurringScheduleRow = {
  id: string;
  template_id: string;
  branch_ids: string[];
  all_branches: boolean;
  day_of_week: number;
  period_length_days: number;
  due_after_days: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  last_run_at: string | null;
  next_run_at: string | null;
};

export async function runRecurringSchedule(
  supabase: SupabaseClient,
  schedule: RecurringScheduleRow,
  runDate: string,
): Promise<{ created: number; error?: string }> {
  const branchIds = await resolveBranchIds(supabase, schedule.all_branches, schedule.branch_ids ?? []);
  const periodStart = runDate;
  const periodEnd = addDays(periodStart, schedule.period_length_days - 1);
  const dueDate = addDays(runDate, schedule.due_after_days);

  const requestedBy = schedule.created_by;
  if (!requestedBy) {
    return { created: 0, error: "Schedule has no created_by user" };
  }

  return createReportRequestsForBranches(supabase, {
    templateId: schedule.template_id,
    branchIds,
    periodStart,
    periodEnd,
    dueDate,
    requestedBy,
  });
}
