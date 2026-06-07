import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

export async function GET() {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const bid = auth.session.branch_id;

    const { data: rows, error } = await supabase
      .from("report_requests")
      .select("id, title, request_type, period_start, period_end, due_date, status, template_id")
      .eq("branch_id", bid)
      .eq("status", "pending")
      .order("due_date", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const tplIds = [...new Set((rows ?? []).map((r) => r.template_id as string))];
    const titles = new Map<string, string>();
    if (tplIds.length > 0) {
      const { data: tpls } = await supabase.from("templates").select("id, title").in("id", tplIds);
      for (const t of tpls ?? []) titles.set(t.id as string, String(t.title));
    }

    const requests = (rows ?? []).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      request_type: r.request_type as string,
      period_start: r.period_start as string,
      period_end: r.period_end as string,
      due_date: r.due_date as string,
      status: r.status as string,
      template_id: r.template_id as string,
      template_title: titles.get(r.template_id as string) ?? "Report",
    }));

    return NextResponse.json({ requests });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
