import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase";
import { requireBranchManagerApi } from "@/lib/branch/require-session";
import type { TemplateField } from "@/lib/kpi-extractor";

export async function GET(_request: Request, ctx: { params: Promise<{ requestId: string }> }) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const { requestId } = await ctx.params;
  if (!requestId) return NextResponse.json({ error: "Missing request id" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const bid = auth.session.branch_id;

    const { data: rr, error: rErr } = await supabase
      .from("report_requests")
      .select("id, title, request_type, period_start, period_end, due_date, status, template_id, branch_id")
      .eq("id", requestId)
      .maybeSingle();

    if (rErr || !rr || rr.branch_id !== bid) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data: tpl, error: tErr } = await supabase.from("templates").select("id, title, type, fields").eq("id", rr.template_id).maybeSingle();

    if (tErr || !tpl) return NextResponse.json({ error: "Template missing" }, { status: 500 });

    const { data: report } = await supabase
      .from("reports")
      .select("id, data, status, submitted_at, updated_at")
      .eq("request_id", requestId)
      .eq("branch_id", bid)
      .maybeSingle();

    let revision_comment: string | null = null;
    if (report?.status === "revision_required" && report.id) {
      const { data: latestComment } = await supabase
        .from("report_comments")
        .select("message")
        .eq("report_id", report.id)
        .like("message", "[Revision requested]%")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (latestComment?.message) {
        revision_comment = latestComment.message.replace(/^\[Revision requested\]\s*/, "");
      }
    }

    const fields = (Array.isArray(tpl.fields) ? tpl.fields : []) as TemplateField[];

    return NextResponse.json({
      request: {
        id: rr.id,
        title: rr.title,
        request_type: rr.request_type,
        period_start: rr.period_start,
        period_end: rr.period_end,
        due_date: rr.due_date,
        status: rr.status,
        template_id: rr.template_id,
      },
      template: {
        id: tpl.id,
        title: tpl.title,
        type: tpl.type,
        fields,
      },
      report: report
        ? {
            id: report.id,
            data: (report.data as Record<string, unknown>) ?? {},
            status: report.status,
            submitted_at: report.submitted_at,
            updated_at: report.updated_at,
            revision_comment,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
