import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api/validate-body";
import { appBaseUrl } from "@/lib/email/app-url";
import { sendReportReviewedEmail } from "@/lib/email/send-report-reviewed";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { formatPeriodLabel } from "@/lib/staff/period";
import { createServiceRoleClient } from "@/lib/supabase";

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

type ReviewOutcome = { reviewed: string[]; skipped: string[]; errors: string[] };

async function reviewOne(
  id: string,
  opts: { isHr: boolean; now: string },
): Promise<{ kind: "reviewed" | "skipped" | "error"; id: string; message?: string; branchId?: string; requestId?: string }> {
  const supabase = createServiceRoleClient();

  const { data: rep, error: fetchErr } = await supabase
    .from("reports")
    .select("id, template_id, status, request_id, branch_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) return { kind: "error", id, message: `${id}: ${fetchErr.message}` };
  if (!rep) return { kind: "error", id, message: `${id}: not found` };

  if (opts.isHr) {
    const { data: tpl } = await supabase.from("templates").select("type").eq("id", rep.template_id).maybeSingle();
    if (tpl?.type !== "hr") return { kind: "skipped", id, message: `${id}: forbidden template type` };
  }

  if (rep.status !== "submitted") {
    return { kind: "skipped", id, message: `${id}: status is ${rep.status}, not submitted` };
  }

  const { error: updateErr } = await supabase
    .from("reports")
    .update({ status: "reviewed", updated_at: opts.now })
    .eq("id", id);

  if (updateErr) {
    if (updateErr.message?.includes("reports_status_check")) {
      return { kind: "error", id, message: `${id}: reviewed status not allowed — run migration` };
    }
    return { kind: "error", id, message: `${id}: ${updateErr.message}` };
  }

  return {
    kind: "reviewed",
    id,
    branchId: rep.branch_id as string,
    requestId: rep.request_id as string,
  };
}

async function notifyReviewed(branchId: string, requestId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const [{ data: branch }, { data: req }, { data: managers }] = await Promise.all([
    supabase.from("branches").select("name").eq("id", branchId).maybeSingle(),
    supabase.from("report_requests").select("title, period_start, period_end").eq("id", requestId).maybeSingle(),
    supabase
      .from("users")
      .select("email")
      .eq("role", "branch_manager")
      .eq("branch_id", branchId)
      .eq("is_active", true),
  ]);

  const emails = [...new Set((managers ?? []).map((u) => String(u.email).trim()).filter(Boolean))];
  if (emails.length === 0) return;

  const branchName = branch?.name ?? "Branch";
  const reportTitle = String(req?.title ?? "Report");
  const period = formatPeriodLabel(String(req?.period_start ?? ""), String(req?.period_end ?? ""));
  const reportsUrl = `${appBaseUrl()}/branch/reports`;

  await Promise.allSettled(
    emails.map((to) =>
      sendReportReviewedEmail({
        to,
        branchName,
        reportTitle,
        period,
        reportsUrl,
      }),
    ),
  );
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

  const parsed = parseBody(bodySchema, raw);
  if (!parsed.ok) return parsed.response;

  try {
    const now = new Date().toISOString();
    const isHr = auth.session.role === "hr";
    const outcomes = await Promise.all(parsed.data.ids.map((id) => reviewOne(id, { isHr, now })));

    const result: ReviewOutcome = { reviewed: [], skipped: [], errors: [] };

    for (const outcome of outcomes) {
      if (outcome.kind === "reviewed") {
        result.reviewed.push(outcome.id);
      } else if (outcome.kind === "skipped") {
        result.skipped.push(outcome.id);
      } else {
        result.errors.push(outcome.message ?? `${outcome.id}: unknown error`);
      }
    }

    void (async () => {
      for (const outcome of outcomes) {
        if (outcome.kind !== "reviewed" || !outcome.branchId || !outcome.requestId) continue;
        try {
          await notifyReviewed(outcome.branchId, outcome.requestId);
        } catch (err) {
          console.error("[bulk-review] email notification failed:", err);
        }
      }
    })();

    return NextResponse.json(result);
  } catch (e) {
    console.error("[POST /api/reports/bulk-review]", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
