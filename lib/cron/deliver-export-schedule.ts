import type { SupabaseClient } from "@supabase/supabase-js";

import { sendExportDeliveryEmail } from "@/lib/email/send-export-delivery";
import { EXPORT_TYPE_LABELS } from "@/lib/exports/delivery-schedule-labels";
import { formatDateRangeLabel } from "@/lib/exports/fetch-data";
import { generateExportPdf, type ScheduledExportType } from "@/lib/exports/generate-pdf";

export type ExportDeliveryScheduleRow = {
  id: string;
  user_id: string;
  export_type: string;
  day_of_week: number;
  hour_utc: number;
  branch_ids: string[];
  all_branches: boolean;
  is_active: boolean;
  last_sent_at: string | null;
};

export function isExportScheduleDue(schedule: ExportDeliveryScheduleRow, now: Date = new Date()): boolean {
  if (!schedule.is_active) return false;
  if (now.getUTCDay() !== schedule.day_of_week) return false;
  if (now.getUTCHours() !== schedule.hour_utc) return false;
  if (schedule.last_sent_at) {
    const lastDay = new Date(schedule.last_sent_at).toISOString().slice(0, 10);
    const today = now.toISOString().slice(0, 10);
    if (lastDay === today) return false;
  }
  return true;
}

export async function deliverExportSchedule(
  supabase: SupabaseClient,
  schedule: ExportDeliveryScheduleRow,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: user, error: userErr } = await supabase
    .from("users")
    .select("email, full_name, role, is_active")
    .eq("id", schedule.user_id)
    .maybeSingle();

  if (userErr) return { ok: false, error: userErr.message };
  if (!user?.email || !user.is_active) return { ok: false, error: "User not found or inactive" };

  const generatedBy =
    (user.full_name && String(user.full_name).trim()) || String(user.email).trim() || "BranchWise AI";
  const hr_only = user.role === "hr";
  const branch_ids = schedule.all_branches ? undefined : (schedule.branch_ids ?? []);

  try {
    const exportType = schedule.export_type as ScheduledExportType;
    const { buffer, filename, start_date, end_date } = await generateExportPdf({
      export_type: exportType,
      branch_ids,
      hr_only,
      generated_by: generatedBy,
    });

    const typeLabel = EXPORT_TYPE_LABELS[exportType] ?? schedule.export_type;
    const periodLabel = formatDateRangeLabel(start_date, end_date);

    const emailed = await sendExportDeliveryEmail({
      to: String(user.email).trim(),
      exportTypeLabel: typeLabel,
      periodLabel,
      filename,
      pdfBuffer: buffer,
    });

    if (!emailed) return { ok: false, error: "Email not configured (RESEND_API_KEY missing)" };

    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from("export_delivery_schedules")
      .update({ last_sent_at: now })
      .eq("id", schedule.id);

    if (updateErr) return { ok: false, error: updateErr.message };

    const branchesLabel = schedule.all_branches ? "All branches" : `${(schedule.branch_ids ?? []).length} branch(es)`;
    await supabase.from("export_history").insert({
      user_id: schedule.user_id,
      export_type: typeLabel,
      start_date,
      end_date,
      branches: branchesLabel,
      format: "pdf",
    });

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Export delivery failed";
    return { ok: false, error: msg };
  }
}
