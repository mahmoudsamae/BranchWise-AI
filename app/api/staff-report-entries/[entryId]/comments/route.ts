import { NextResponse } from "next/server";

import { requireHrOrBranchManagerApi } from "@/lib/gm-hr/require-session";
import { notifyStaffReportComment } from "@/lib/staff/discussion-notify";
import { canAccessStaffReportEntry, loadStaffReportEntry } from "@/lib/staff/report-entry-access";
import { createServiceRoleClient } from "@/lib/supabase";

type Ctx = { params: Promise<{ entryId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const auth = await requireHrOrBranchManagerApi();
  if (!auth.ok) return auth.response;

  const session = auth.session;

  const { entryId } = await ctx.params;

  try {
    const entry = await loadStaffReportEntry(entryId);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccessStaffReportEntry(entry, session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();
    const { data: comments, error } = await supabase
      .from("staff_report_entry_comments")
      .select("id, user_id, message, created_at")
      .eq("staff_report_entry_id", entryId)
      .order("created_at");

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ error: "Discussion not available — run database migration" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = [...new Set((comments ?? []).map((c) => c.user_id))];
    const { data: users } =
      userIds.length > 0
        ? await supabase.from("users").select("id, full_name, email, role").in("id", userIds)
        : { data: [] };
    const userMap = new Map((users ?? []).map((u) => [u.id, u]));

    return NextResponse.json({
      comments: (comments ?? []).map((c) => ({ ...c, user: userMap.get(c.user_id) ?? null })),
      staff_member_id: entry.staff_member_id,
    });
  } catch (e) {
    console.error("[GET staff-report-entries comments]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request, ctx: Ctx) {
  const auth = await requireHrOrBranchManagerApi();
  if (!auth.ok) return auth.response;

  const session = auth.session;

  const { entryId } = await ctx.params;

  let body: { message?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });

  try {
    const entry = await loadStaffReportEntry(entryId);
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canAccessStaffReportEntry(entry, session)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = createServiceRoleClient();
    const { data: row, error } = await supabase
      .from("staff_report_entry_comments")
      .insert({
        staff_report_entry_id: entryId,
        user_id: session.id,
        message,
      })
      .select("id, user_id, message, created_at")
      .single();

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ error: "Discussion not available — run database migration" }, { status: 503 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("id, full_name, email, role")
      .eq("id", session.id)
      .maybeSingle();

    try {
      await notifyStaffReportComment({ entry, author: session, message });
    } catch (notifyErr) {
      console.error("[POST staff-report-entries comments] notify failed", notifyErr);
    }

    return NextResponse.json({ comment: { ...row, user } });
  } catch (e) {
    console.error("[POST staff-report-entries comments]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
