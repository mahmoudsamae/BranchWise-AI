import { NextResponse } from "next/server";

import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const { data: rep, error } = await supabase
      .from("reports")
      .select("id, branch_id, template_id, request_id, data, status, submitted_at, updated_at, submitted_by")
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!rep) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (auth.session.role === "hr") {
      const { data: tpl } = await supabase.from("templates").select("type").eq("id", rep.template_id).maybeSingle();
      if (tpl?.type !== "hr") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [{ data: branch }, { data: template }, { data: rr }, { data: comments }, { data: summary }] = await Promise.all([
      supabase.from("branches").select("id, name, location").eq("id", rep.branch_id).maybeSingle(),
      supabase.from("templates").select("id, title, type, fields").eq("id", rep.template_id).maybeSingle(),
      supabase
        .from("report_requests")
        .select(
          "period_start, period_end, title, due_date, requested_by, users!report_requests_requested_by_fkey(id, full_name, role)",
        )
        .eq("id", rep.request_id)
        .maybeSingle(),
      supabase.from("report_comments").select("id, user_id, message, created_at").eq("report_id", id).order("created_at"),
      supabase.from("ai_summaries").select("summary, generated_at").eq("report_id", id).maybeSingle(),
    ]);

    const userIds = [...new Set((comments ?? []).map((c) => c.user_id))];
    const { data: users } =
      userIds.length > 0 ? await supabase.from("users").select("id, full_name, email, role").in("id", userIds) : { data: [] };
    const userMap = new Map((users ?? []).map((u) => [u.id, u]));

    let submitter = null;
    if (rep.submitted_by) {
      const { data: sub } = await supabase
        .from("users")
        .select("id, full_name, email, role")
        .eq("id", rep.submitted_by)
        .maybeSingle();
      submitter = sub;
    }

    type RequesterRow = { id: string; full_name: string | null; role: string };
    const rrUsers = rr?.users as RequesterRow | RequesterRow[] | null | undefined;
    let requesterUser = Array.isArray(rrUsers) ? rrUsers[0] : rrUsers;

    if (!requesterUser && rr?.requested_by) {
      const { data: reqUser } = await supabase
        .from("users")
        .select("id, full_name, role")
        .eq("id", rr.requested_by as string)
        .maybeSingle();
      requesterUser = reqUser ?? undefined;
    }

    const requested_by =
      requesterUser && rr?.requested_by
        ? {
            id: requesterUser.id,
            full_name: requesterUser.full_name,
            role: requesterUser.role,
          }
        : null;

    const { requested_by: _rb, users: _users, ...requestFields } = (rr ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      report: rep,
      branch,
      template,
      request: rr ? requestFields : null,
      requested_by,
      submitter,
      comments: (comments ?? []).map((c) => ({
        ...c,
        user: userMap.get(c.user_id) ?? null,
      })),
      ai_summary: summary,
    });
  } catch (e) {
    console.error("[GET /api/reports/[id]] error:", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
