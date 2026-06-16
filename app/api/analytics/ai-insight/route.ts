import { NextResponse } from "next/server";

import { isDemoSession } from "@/lib/demo/guard";
import { demoAiInsight } from "@/lib/demo/mock-data";
import { resolvePeriod } from "@/lib/gm-hr/analytics-period";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 503 });
  }

  let body: { period?: string; branch_id?: string; start?: string; end?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  const hrOnly = auth.session.role === "hr";
  const today = new Date().toISOString().slice(0, 10);
  const { current } = resolvePeriod(body.period ?? "week", body.start, body.end);
  const branchFilter = body.branch_id && body.branch_id !== "all" ? body.branch_id : null;

  try {
    const supabase = createServiceRoleClient();

    let repQ = supabase
      .from("reports")
      .select("id, branch_id, data, submitted_at, status, branches(name), templates(title, type)")
      .in("status", ["submitted", "reviewed"])
      .order("submitted_at", { ascending: false })
      .limit(10);

    if (branchFilter) repQ = repQ.eq("branch_id", branchFilter);

    const { data: reports, error: repErr } = await repQ;
    if (repErr) {
      console.error("[POST /api/analytics/ai-insight] reports error:", repErr);
      return NextResponse.json({ error: repErr.message }, { status: 500 });
    }

    let reportList = reports ?? [];
    if (hrOnly) {
      reportList = reportList.filter((r) => {
        const tpl = r.templates as { type?: string } | { type?: string }[] | null;
        const type = Array.isArray(tpl) ? tpl[0]?.type : tpl?.type;
        return type === "hr";
      });
    }

    let kpiQ = supabase
      .from("kpis")
      .select("branch_id, revenue, occupancy_rate, negative_feedback, positive_feedback, unpaid_departures, repeated_issues, support_needed, period_end, branches(name)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (branchFilter) kpiQ = kpiQ.eq("branch_id", branchFilter);

    const { data: kpis, error: kpiErr } = await kpiQ;
    if (kpiErr) {
      console.error("[POST /api/analytics/ai-insight] kpis error:", kpiErr);
      return NextResponse.json({ error: kpiErr.message }, { status: 500 });
    }

    const reportLines = reportList.map((r) => {
      const branch = r.branches as { name?: string } | { name?: string }[] | null;
      const tpl = r.templates as { title?: string; type?: string } | { title?: string; type?: string }[] | null;
      const branchName = Array.isArray(branch) ? branch[0]?.name : branch?.name;
      const templateTitle = Array.isArray(tpl) ? tpl[0]?.title : tpl?.title;
      const dataStr = JSON.stringify(r.data ?? {}).slice(0, 400);
      return `- ${branchName ?? "Branch"} | ${templateTitle ?? "Report"} | submitted ${r.submitted_at ?? "n/a"} | data: ${dataStr}`;
    });

    const kpiLines = (kpis ?? []).map((k) => {
      const branch = k.branches as { name?: string } | { name?: string }[] | null;
      const branchName = Array.isArray(branch) ? branch[0]?.name : branch?.name;
      return `- ${branchName ?? "Branch"} | period end ${k.period_end} | revenue €${Number(k.revenue ?? 0)} | occupancy ${Number(k.occupancy_rate ?? 0)}% | neg feedback ${Number(k.negative_feedback ?? 0)} | pos ${Number(k.positive_feedback ?? 0)} | issues ${Number(k.repeated_issues ?? 0)} | support ${Number(k.support_needed ?? 0)}`;
    });

    const context = [
      `Analytics period: ${current.start} to ${current.end}.`,
      `Submitted reports (latest ${reportList.length}):`,
      reportLines.length ? reportLines.join("\n") : "None.",
      `KPI rows (latest ${(kpis ?? []).length}):`,
      kpiLines.length ? kpiLines.join("\n") : "None.",
    ].join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are an operations analyst for AZUR Camping, a multi-branch hospitality company. " +
              "Rules: 1) Always mention specific branch names and exact numbers. " +
              "2) Structure your response as: one sentence on top performer, one sentence on biggest risk, one actionable recommendation. " +
              "3) Use German if the data contains German branch names. " +
              "4) Never say 'I don't have enough data' — always give a best-effort insight.",
          },
          {
            role: "user",
            content: "Based on this real operational data, provide a 3-sentence insight:\n" + context,
          },
        ],
        max_tokens: 350,
      }),
    });

    if (!res.ok) {
      console.error("[POST /api/analytics/ai-insight] OpenAI failed:", res.status, await res.text());
      return NextResponse.json({ error: "OpenAI request failed" }, { status: 502 });
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const insight = json.choices?.[0]?.message?.content?.trim() ?? "No insight generated.";

    const scope = hrOnly ? "hr" : "gm";
    const bid = branchFilter;
    let del = supabase.from("analytics_insight_cache").delete().eq("insight_date", today).eq("scope", scope);
    del = bid ? del.eq("branch_id", bid) : del.is("branch_id", null);
    await del;
    await supabase.from("analytics_insight_cache").insert({
      insight_date: today,
      scope,
      branch_id: bid,
      insight,
    });

    return NextResponse.json({ insight, cached: true });
  } catch (e) {
    console.error("[POST /api/analytics/ai-insight] error:", e);
    const msg = e instanceof Error ? e.message : "Failed";
    if (msg.includes("analytics_insight_cache")) {
      return NextResponse.json({ insight: "Insight generated but cache table is missing. Run migration 20260522000000." });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;
  if (isDemoSession(auth.session)) return NextResponse.json(demoAiInsight());

  const url = new URL(request.url);
  const branchId = url.searchParams.get("branch_id");
  const today = new Date().toISOString().slice(0, 10);
  const scope = auth.session.role === "hr" ? "hr" : "gm";

  try {
    const supabase = createServiceRoleClient();
    let q = supabase.from("analytics_insight_cache").select("insight, generated_at").eq("insight_date", today).eq("scope", scope);
    if (branchId && branchId !== "all") q = q.eq("branch_id", branchId);
    else q = q.is("branch_id", null);
    const { data } = await q.order("generated_at", { ascending: false }).limit(1).maybeSingle();
    return NextResponse.json({ insight: data?.insight ?? null });
  } catch (e) {
    console.error("[GET /api/analytics/ai-insight] error:", e);
    return NextResponse.json({ insight: null });
  }
}
