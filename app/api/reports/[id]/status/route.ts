import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api/validate-body";
import { appBaseUrl } from "@/lib/email/app-url";
import { sendReportReviewedEmail } from "@/lib/email/send-report-reviewed";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { formatPeriodLabel } from "@/lib/staff/period";
import { createServiceRoleClient } from "@/lib/supabase";

const statusBodySchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("reviewed") }),
  z.object({
    status: z.literal("revision_required"),
    comment: z.string().trim().min(1, "Comment is required").max(1000),
  }),
]);

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(statusBodySchema, raw);
  if (!parsed.ok) return parsed.response;

  try {
    const supabase = createServiceRoleClient();
    const { data: rep } = await supabase
      .from("reports")
      .select("id, template_id, status, request_id, branch_id")
      .eq("id", id)
      .maybeSingle();
    if (!rep) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (auth.session.role === "hr") {
      const { data: tpl } = await supabase.from("templates").select("type").eq("id", rep.template_id).maybeSingle();
      if (tpl?.type !== "hr") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (rep.status !== "submitted") {
      return NextResponse.json({ error: "Report must be submitted before review" }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (parsed.data.status === "reviewed") {
      const { data, error } = await supabase
        .from("reports")
        .update({ status: "reviewed", updated_at: now })
        .eq("id", id)
        .select("id, status, updated_at")
        .single();

      if (error) {
        if (error.message?.includes("reports_status_check")) {
          return NextResponse.json({ error: "Run migration to allow reviewed status" }, { status: 503 });
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      void (async () => {
        try {
          const branchId = rep.branch_id as string;
          const [{ data: branch }, { data: req }, { data: managers }] = await Promise.all([
            supabase.from("branches").select("name").eq("id", branchId).maybeSingle(),
            supabase.from("report_requests").select("title, period_start, period_end").eq("id", rep.request_id).maybeSingle(),
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

          const results = await Promise.allSettled(
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

          for (const result of results) {
            if (result.status === "rejected") {
              console.error("[report-reviewed] email notification failed:", result.reason);
            }
          }
        } catch (err) {
          console.error("[report-reviewed] email notification failed:", err);
        }
      })();

      return NextResponse.json({ report: data });
    }

    const { comment } = parsed.data;
    const revisionMessage = `[Revision requested] ${comment}`;

    const { error: commentErr } = await supabase.from("report_comments").insert({
      report_id: id,
      user_id: auth.session.id,
      message: revisionMessage,
    });

    if (commentErr) {
      if (commentErr.message?.includes("report_comments") || commentErr.code === "42P01") {
        return NextResponse.json({ error: "Comments table missing — run migration 20260521000000" }, { status: 503 });
      }
      return NextResponse.json({ error: commentErr.message }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("reports")
      .update({ status: "revision_required", updated_at: now })
      .eq("id", id)
      .select("id, status, updated_at")
      .single();

    if (error) {
      if (error.message?.includes("reports_status_check")) {
        return NextResponse.json({ error: "Run migration to allow revision_required status" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { error: reqErr } = await supabase
      .from("report_requests")
      .update({ status: "pending", updated_at: now })
      .eq("id", rep.request_id);

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 400 });

    return NextResponse.json({ report: data });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
