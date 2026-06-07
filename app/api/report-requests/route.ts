import { NextResponse } from "next/server";

import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { getRequesterUserIds, getTemplateIdsForRole } from "@/lib/hr/requester-filter";
import { createServiceRoleClient } from "@/lib/supabase";

function toIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const s = value.trim();
  const datePart = s.length >= 10 ? s.slice(0, 10) : s;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return null;
  return datePart;
}

export async function GET(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim() || null;
  const branchId = url.searchParams.get("branch_id")?.trim() || null;
  const templateId = url.searchParams.get("template_id")?.trim() || null;

  try {
    const supabase = createServiceRoleClient();
    // GM: requests where users.role = general_manager; HR: users.role = hr
    const [requesterIds, allowedTemplateIds] = await Promise.all([
      getRequesterUserIds(supabase, auth.session.role),
      getTemplateIdsForRole(supabase, auth.session.role),
    ]);

    if (requesterIds.length === 0 || allowedTemplateIds.length === 0) {
      return NextResponse.json({ requests: [] });
    }

    let q = supabase
      .from("report_requests")
      .select(
        "id, title, status, request_type, period_start, period_end, due_date, created_at, branch_id, template_id, requested_by",
      )
      .in("requested_by", requesterIds)
      .in("template_id", allowedTemplateIds)
      .order("created_at", { ascending: false });

    if (status) q = q.eq("status", status);
    if (branchId) q = q.eq("branch_id", branchId);
    if (templateId) q = q.eq("template_id", templateId);

    const { data: list, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = list ?? [];
    const branchIds = [...new Set(rows.map((r) => r.branch_id).filter(Boolean))] as string[];
    const templateIds = [...new Set(rows.map((r) => r.template_id).filter(Boolean))] as string[];

    const branchNameById = new Map<string, string>();
    const templateTitleById = new Map<string, string>();

    if (branchIds.length > 0) {
      const { data: branches, error: bErr } = await supabase.from("branches").select("id, name").in("id", branchIds);
      if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
      for (const b of branches ?? []) branchNameById.set(b.id, b.name ?? "");
    }
    const scopedTplIds = templateIds.filter((id) => allowedTemplateIds.includes(id));
    if (scopedTplIds.length > 0) {
      const { data: templates, error: tErr } = await supabase.from("templates").select("id, title").in("id", scopedTplIds);
      if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });
      for (const t of templates ?? []) templateTitleById.set(t.id, t.title ?? "");
    }

    const ids = rows.map((r) => r.id).filter(Boolean);
    const reportMap = new Map<string, { submitted_at: string | null; status: string | null }>();

    if (ids.length > 0) {
      const { data: reps, error: rErr } = await supabase
        .from("reports")
        .select("request_id, branch_id, submitted_at, status")
        .in("request_id", ids);
      if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });
      for (const r of reps ?? []) {
        const key = `${r.request_id}|${r.branch_id}`;
        reportMap.set(key, { submitted_at: r.submitted_at ?? null, status: r.status ?? null });
      }
    }

    const requests = rows.map((row) => {
      const bid = row.branch_id as string;
      const rid = row.id as string;
      const rep = reportMap.get(`${rid}|${bid}`);
      return {
        id: row.id,
        title: row.title,
        status: row.status,
        request_type: row.request_type,
        period_start: row.period_start,
        period_end: row.period_end,
        due_date: row.due_date,
        created_at: row.created_at,
        branch_id: row.branch_id,
        template_id: row.template_id,
        branch_name: branchNameById.get(bid) ?? null,
        template_title: templateTitleById.get(row.template_id as string) ?? null,
        report_submitted_at: rep?.submitted_at ?? null,
        report_status: rep?.status ?? null,
      };
    });

    return NextResponse.json({ requests });
  } catch (e) {
    console.error("[GET /api/report-requests] error:", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  let body: {
    template_id?: string;
    branch_ids?: unknown;
    all_branches?: unknown;
    due_date?: unknown;
    period_start?: unknown;
    period_end?: unknown;
    title?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const templateId = String(body.template_id ?? "").trim();
  if (!templateId) return NextResponse.json({ error: "template_id is required" }, { status: 400 });

  const allBranches = body.all_branches === true || body.all_branches === "true";
  let branchIds = Array.isArray(body.branch_ids) ? body.branch_ids.map((b) => String(b).trim()).filter(Boolean) : [];
  if (!allBranches && branchIds.length === 0) {
    return NextResponse.json({ error: "branch_ids must be a non-empty array or set all_branches to true" }, { status: 400 });
  }

  const periodStart = toIsoDate(body.period_start);
  const periodEnd = toIsoDate(body.period_end);
  const dueDate = toIsoDate(body.due_date);
  if (!periodStart || !periodEnd || !dueDate) {
    return NextResponse.json({ error: "period_start, period_end, and due_date must be valid dates (YYYY-MM-DD)" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();

    if (allBranches) {
      const { data: allRows, error: bErr } = await supabase
        .from("branches")
        .select("id")
        .eq("is_active", true)
        .order("name");
      if (bErr) {
        console.error("[POST /api/report-requests] branches query failed:", bErr);
        return NextResponse.json({ error: bErr.message }, { status: 500 });
      }
      branchIds = (allRows ?? []).map((b) => b.id).filter(Boolean);
    }

    if (branchIds.length === 0) {
      return NextResponse.json({ error: "No branches found" }, { status: 400 });
    }

    const allowedTemplateIds = await getTemplateIdsForRole(supabase, auth.session.role);
    const { data: tpl, error: tErr } = await supabase.from("templates").select("id, title, type").eq("id", templateId).maybeSingle();
    if (tErr) return NextResponse.json({ error: tErr.message }, { status: 400 });
    if (!tpl) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    if (allowedTemplateIds.length > 0 && !allowedTemplateIds.includes(tpl.id)) {
      return NextResponse.json({ error: "Template not allowed for your role" }, { status: 403 });
    }

    const baseTitle =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : `${tpl.title} — ${periodStart} → ${periodEnd}`;

    const requestType = typeof tpl.type === "string" && tpl.type.trim() ? tpl.type.trim() : "standard";

    const rows = branchIds.map((branch_id) => ({
      branch_id,
      template_id: templateId,
      title: baseTitle,
      request_type: requestType,
      period_start: periodStart,
      period_end: periodEnd,
      due_date: dueDate,
      status: "pending" as const,
      requested_by: auth.session.id,
      updated_at: new Date().toISOString(),
    }));

    const { data: created, error } = await supabase.from("report_requests").insert(rows).select("id, branch_id, title, status, due_date");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ requests: created ?? [] });
  } catch (e) {
    console.error("[POST /api/report-requests] error:", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
