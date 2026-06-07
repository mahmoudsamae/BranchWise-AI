import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

async function canAccessReport(branchId: string | null) {
  const gmHr = await requireGmOrHrApi();
  if (gmHr.ok) return { ok: true as const, session: gmHr.session };

  const branch = await requireBranchManagerApi();
  if (branch.ok && branch.session.branch_id === branchId) {
    return { ok: true as const, session: branch.session };
  }

  if (!gmHr.ok && !branch.ok && gmHr.response.status === 401 && branch.response.status === 401) {
    return { ok: false as const, status: 401 as const };
  }

  return { ok: false as const, status: 403 as const };
}

export async function POST(request: Request, ctx: Ctx) {
  const { id: reportId } = await ctx.params;
  if (!reportId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: { message?: string };
  try {
    body = (await request.json()) as { message?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const { data: rep } = await supabase.from("reports").select("id, branch_id, template_id").eq("id", reportId).maybeSingle();
    if (!rep) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const access = await canAccessReport(rep.branch_id as string);
    if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: access.status });

    if (access.session.role === "hr") {
      const { data: tpl } = await supabase.from("templates").select("type").eq("id", rep.template_id).maybeSingle();
      if (tpl?.type !== "hr") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: row, error } = await supabase
      .from("report_comments")
      .insert({ report_id: reportId, user_id: access.session.id, message })
      .select("id, user_id, message, created_at")
      .single();

    if (error) {
      if (error.message?.includes("report_comments") || error.code === "42P01") {
        return NextResponse.json({ error: "Comments table missing — run migration 20260521000000" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("id", access.session.id)
      .maybeSingle();

    return NextResponse.json({ comment: { ...row, user } });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function GET(_request: Request, ctx: Ctx) {
  const gmHr = await requireGmOrHrApi();
  const branch = gmHr.ok ? null : await requireBranchManagerApi();
  if (!gmHr.ok && !branch?.ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: reportId } = await ctx.params;
  try {
    const supabase = createServiceRoleClient();
    const { data: comments, error } = await supabase
      .from("report_comments")
      .select("id, user_id, message, created_at")
      .eq("report_id", reportId)
      .order("created_at");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const userIds = [...new Set((comments ?? []).map((c) => c.user_id))];
    const { data: users } =
      userIds.length > 0 ? await supabase.from("users").select("id, full_name, email, role").in("id", userIds) : { data: [] };
    const userMap = new Map((users ?? []).map((u) => [u.id, u]));

    return NextResponse.json({
      comments: (comments ?? []).map((c) => ({ ...c, user: userMap.get(c.user_id) ?? null })),
    });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
