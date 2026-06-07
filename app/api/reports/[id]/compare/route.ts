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

    const { data: rep, error: repErr } = await supabase
      .from("reports")
      .select("id, branch_id, template_id, request_id")
      .eq("id", id)
      .maybeSingle();

    if (repErr) return NextResponse.json({ error: repErr.message }, { status: 500 });
    if (!rep) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (auth.session.role === "hr") {
      const { data: tpl } = await supabase.from("templates").select("type").eq("id", rep.template_id).maybeSingle();
      if (tpl?.type !== "hr") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: currentReq, error: reqErr } = await supabase
      .from("report_requests")
      .select("period_start, period_end")
      .eq("id", rep.request_id)
      .maybeSingle();

    if (reqErr) return NextResponse.json({ error: reqErr.message }, { status: 500 });
    if (!currentReq) return NextResponse.json({ previous: null });

    const { data: prevReq } = await supabase
      .from("report_requests")
      .select("id, period_start, period_end")
      .eq("branch_id", rep.branch_id)
      .eq("template_id", rep.template_id)
      .lt("period_end", currentReq.period_start)
      .order("period_end", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!prevReq) return NextResponse.json({ previous: null });

    const { data: prevRep } = await supabase
      .from("reports")
      .select("data, status")
      .eq("request_id", prevReq.id)
      .in("status", ["submitted", "reviewed"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!prevRep) return NextResponse.json({ previous: null });

    return NextResponse.json({
      previous: {
        period_start: String(prevReq.period_start),
        period_end: String(prevReq.period_end),
        data: (prevRep.data as Record<string, unknown>) ?? {},
        status: String(prevRep.status),
      },
    });
  } catch (e) {
    console.error("[GET /api/reports/[id]/compare]", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
