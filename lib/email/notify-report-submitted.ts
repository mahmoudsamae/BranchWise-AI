import type { SupabaseClient } from "@supabase/supabase-js";

import { appBaseUrl } from "@/lib/email/app-url";
import { sendReportSubmittedEmail } from "@/lib/email/send-report-submitted";
import { formatPeriodLabel } from "@/lib/staff/period";

export async function notifyReportSubmitted(
  supabase: SupabaseClient,
  opts: {
    reportId: string;
    branchId: string;
    templateId: string;
    periodStart: string;
    periodEnd: string;
    requestTitle: string;
  },
): Promise<void> {
  const [{ data: branch }, { data: template }] = await Promise.all([
    supabase.from("branches").select("name").eq("id", opts.branchId).maybeSingle(),
    supabase.from("templates").select("type, title").eq("id", opts.templateId).maybeSingle(),
  ]);

  const templateType = String(template?.type ?? "");
  const isHr = templateType === "hr";
  const notifyRole = isHr ? "hr" : "general_manager";
  const reportsPath = isHr ? "/hr/reports" : "/dashboard/reports";

  const { data: recipients } = await supabase
    .from("users")
    .select("email")
    .eq("role", notifyRole)
    .eq("is_active", true);

  const emails = [...new Set((recipients ?? []).map((u) => String(u.email).trim()).filter(Boolean))];
  if (emails.length === 0) return;

  const branchName = branch?.name ?? "Branch";
  const reportTitle = opts.requestTitle.trim() || template?.title?.trim() || "Report";
  const period = formatPeriodLabel(opts.periodStart, opts.periodEnd);
  const dashboardUrl = `${appBaseUrl()}${reportsPath}/${opts.reportId}`;

  const results = await Promise.allSettled(
    emails.map((to) =>
      sendReportSubmittedEmail({
        to,
        branchName,
        reportTitle,
        period,
        dashboardUrl,
      }),
    ),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[report-submit] email notification failed:", result.reason);
    }
  }
}
