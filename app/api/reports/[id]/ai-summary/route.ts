import { NextResponse } from "next/server";

import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured on the server" }, { status: 503 });
  }

  const { id } = await ctx.params;

  try {
    const supabase = createServiceRoleClient();
    const { data: rep } = await supabase
      .from("reports")
      .select("id, branch_id, template_id, request_id, data, status")
      .eq("id", id)
      .maybeSingle();
    if (!rep) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (auth.session.role === "hr") {
      const { data: tpl } = await supabase.from("templates").select("type").eq("id", rep.template_id).maybeSingle();
      if (tpl?.type !== "hr") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [{ data: branch }, { data: template }, { data: rr }] = await Promise.all([
      supabase.from("branches").select("name").eq("id", rep.branch_id).maybeSingle(),
      supabase.from("templates").select("title, fields").eq("id", rep.template_id).maybeSingle(),
      supabase.from("report_requests").select("period_start, period_end").eq("id", rep.request_id).maybeSingle(),
    ]);

    const fields = (Array.isArray(template?.fields) ? template.fields : []).flatMap((field) => {
      if (!field || typeof field !== "object" || Array.isArray(field)) return [];
      const f = field as { id?: string; label?: string };
      return [f];
    });
    const data = (rep.data as Record<string, unknown>) ?? {};
    const lines = fields.map((f) => {
      const label = f.label ?? f.id ?? "field";
      const val = data[f.id ?? ""] ?? "—";
      return `${label}: ${typeof val === "object" ? JSON.stringify(val) : val}`;
    });

    const prompt = `Summarize this branch operations report in 3-5 bullet points for a general manager. Branch: ${branch?.name ?? "Unknown"}. Period: ${rr?.period_start ?? "?"} to ${rr?.period_end ?? "?"}.\n\nData:\n${lines.join("\n")}`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an operations analyst for a multi-branch hospitality business. Be concise and actionable." },
          { role: "user", content: prompt },
        ],
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `OpenAI error: ${errText.slice(0, 200)}` }, { status: 502 });
    }

    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const summary = json.choices?.[0]?.message?.content?.trim() ?? "No summary generated.";

    const { error: saveErr } = await supabase.from("ai_summaries").upsert(
      {
        report_id: id,
        branch_id: rep.branch_id,
        summary,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "report_id" },
    );

    if (saveErr && !saveErr.message?.includes("ai_summaries")) {
      return NextResponse.json({ summary, warning: "Summary generated but not saved to database" });
    }

    return NextResponse.json({ summary });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
