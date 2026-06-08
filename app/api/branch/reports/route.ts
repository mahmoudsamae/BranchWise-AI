import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { dedupeReportsByRequest } from "@/lib/reports/dedupe-by-request";
import { createServiceRoleClient } from "@/lib/supabase";
import { asJson } from "@/lib/supabase-json";

type DraftBody = {
  request_id?: string;
  template_id?: string;
  data?: Record<string, unknown>;
};

export async function POST(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  let body: DraftBody;
  try {
    body = (await request.json()) as DraftBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const request_id = String(body.request_id ?? "");
  const template_id = String(body.template_id ?? "");
  const data = body.data && typeof body.data === "object" ? body.data : {};

  if (!request_id || !template_id) {
    return NextResponse.json({ error: "request_id and template_id are required" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const bid = auth.session.branch_id;

    const { data: rr, error: rErr } = await supabase
      .from("report_requests")
      .select("id, branch_id, template_id, status")
      .eq("id", request_id)
      .maybeSingle();

    if (rErr || !rr || rr.branch_id !== bid) {
      return NextResponse.json({ error: "Report request not found" }, { status: 404 });
    }

    if (rr.template_id !== template_id) {
      return NextResponse.json({ error: "Template mismatch" }, { status: 400 });
    }

    if (rr.status !== "pending") {
      return NextResponse.json({ error: "This request is no longer open" }, { status: 400 });
    }

    const { data: existing } = await supabase.from("reports").select("id, status").eq("request_id", request_id).eq("branch_id", bid).maybeSingle();

    if (existing?.status === "submitted") {
      return NextResponse.json({ error: "Report already submitted" }, { status: 400 });
    }

    if (existing && existing.status !== "draft" && existing.status !== "revision_required") {
      return NextResponse.json({ error: "Report cannot be edited in its current state" }, { status: 400 });
    }

    const saveStatus = existing?.status === "revision_required" ? "revision_required" : "draft";
    const now = new Date().toISOString();
    const row = {
      branch_id: bid,
      request_id,
      template_id,
      data: asJson(data),
      status: saveStatus,
      updated_at: now,
    };

    if (existing) {
      const { data: updated, error } = await supabase
        .from("reports")
        .update({ ...row, updated_at: now })
        .eq("id", existing.id)
        .select("id, status, updated_at")
        .single();
      if (error || !updated) return NextResponse.json({ error: error?.message ?? "Save failed" }, { status: 400 });
      return NextResponse.json({ report: updated });
    }

    const { data: inserted, error } = await supabase.from("reports").insert(row).select("id, status, updated_at").single();
    if (error) {
      if (error.code === "23505") {
        const { data: raced } = await supabase
          .from("reports")
          .select("id, status, updated_at")
          .eq("request_id", request_id)
          .eq("branch_id", bid)
          .maybeSingle();
        if (raced) return NextResponse.json({ report: raced });
      }
      return NextResponse.json({ error: error.message ?? "Save failed" }, { status: 400 });
    }
    if (!inserted) return NextResponse.json({ error: "Save failed" }, { status: 400 });
    return NextResponse.json({ report: inserted });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}

export async function GET() {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const bid = auth.session.branch_id;

    const { data: reps, error } = await supabase
      .from("reports")
      .select("id, request_id, template_id, status, submitted_at, created_at, updated_at")
      .eq("branch_id", bid)
      .order("updated_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const reqIds = [...new Set((reps ?? []).map((r) => r.request_id as string))];
    const reqById = new Map<
      string,
      {
        title: string;
        request_type: string;
        period_start: string;
        period_end: string;
        due_date: string;
        status: string;
      }
    >();
    const tplById = new Map<string, { title: string; type: string }>();

    if (reqIds.length > 0) {
      const { data: reqs } = await supabase
        .from("report_requests")
        .select("id, title, request_type, period_start, period_end, due_date, status, template_id")
        .in("id", reqIds);
      const tplIds = [...new Set((reqs ?? []).map((q) => q.template_id as string))];
      if (tplIds.length > 0) {
        const { data: tpls } = await supabase.from("templates").select("id, title, type").in("id", tplIds);
        for (const t of tpls ?? []) tplById.set(t.id as string, { title: String(t.title), type: String(t.type) });
      }
      for (const q of reqs ?? []) {
        reqById.set(q.id as string, {
          title: String(q.title),
          request_type: String(q.request_type),
          period_start: String(q.period_start),
          period_end: String(q.period_end),
          due_date: String(q.due_date),
          status: String(q.status),
        });
      }
    }

    const mapped = (reps ?? []).map((r) => {
      const req = reqById.get(r.request_id as string);
      const tpl = tplById.get(r.template_id as string);
      return {
        id: r.id as string,
        request_id: r.request_id as string,
        template_id: r.template_id as string,
        status: r.status as string,
        submitted_at: r.submitted_at as string | null,
        created_at: r.created_at as string,
        updated_at: r.updated_at as string,
        request_title: req?.title ?? "—",
        request_type: req?.request_type ?? "—",
        period_start: req?.period_start ?? "",
        period_end: req?.period_end ?? "",
        due_date: req?.due_date ?? "",
        request_status: req?.status ?? "",
        template_title: tpl?.title ?? "—",
        template_type: tpl?.type ?? "—",
      };
    });

    const reports = dedupeReportsByRequest(mapped);

    return NextResponse.json({ reports });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
