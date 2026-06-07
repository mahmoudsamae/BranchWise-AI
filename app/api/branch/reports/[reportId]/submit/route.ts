import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { notifyReportSubmitted } from "@/lib/email/notify-report-submitted";
import { extractAndSaveKPIs } from "@/lib/kpi-extractor";
import { createServiceRoleClient } from "@/lib/supabase";

export async function POST(_request: Request, ctx: { params: Promise<{ reportId: string }> }) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const { reportId } = await ctx.params;
  if (!reportId) return NextResponse.json({ error: "Missing report id" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const bid = auth.session.branch_id;
    if (!bid) return NextResponse.json({ error: "Branch not assigned" }, { status: 403 });

    const { data: rep, error: repErr } = await supabase
      .from("reports")
      .select("id, branch_id, request_id, template_id, data, status")
      .eq("id", reportId)
      .maybeSingle();

    if (repErr || !rep || rep.branch_id !== bid) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (rep.status === "submitted") {
      return NextResponse.json({ error: "Already submitted" }, { status: 400 });
    }

    if (rep.status !== "draft" && rep.status !== "revision_required") {
      return NextResponse.json({ error: "Report cannot be submitted in its current state" }, { status: 400 });
    }

    const { data: rr, error: rrErr } = await supabase
      .from("report_requests")
      .select("id, status, period_start, period_end, template_id, title")
      .eq("id", rep.request_id)
      .maybeSingle();

    if (rrErr || !rr || rr.status !== "pending") {
      return NextResponse.json({ error: "Request is not open for submission" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const data = (rep.data as Record<string, unknown>) ?? {};

    const { error: u1 } = await supabase
      .from("reports")
      .update({
        status: "submitted",
        submitted_at: now,
        updated_at: now,
        submitted_by: auth.session.id,
      })
      .eq("id", reportId);

    if (u1) return NextResponse.json({ error: u1.message }, { status: 400 });

    const { error: u2 } = await supabase.from("report_requests").update({ status: "submitted", updated_at: now }).eq("id", rr.id);

    if (u2) return NextResponse.json({ error: u2.message }, { status: 400 });

    await extractAndSaveKPIs(reportId, bid, String(rr.period_start), String(rr.period_end), data);

    void notifyReportSubmitted(supabase, {
      reportId,
      branchId: bid,
      templateId: String(rep.template_id),
      periodStart: String(rr.period_start),
      periodEnd: String(rr.period_end),
      requestTitle: String(rr.title ?? ""),
    }).catch((e) => console.error("[POST /api/branch/reports/submit] notify failed:", e));

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[POST /api/branch/reports/submit] error:", e);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
