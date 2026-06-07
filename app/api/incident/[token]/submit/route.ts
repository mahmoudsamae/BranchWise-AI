import { NextResponse } from "next/server";

import { resolveIncidentByBranchToken } from "@/lib/company-forms/resolve-invite";
import { validateFormSubmission } from "@/lib/company-forms/validate-submission";
import { createServiceRoleClient } from "@/lib/supabase";
import { asJson } from "@/lib/supabase-json";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const resolved = await resolveIncidentByBranchToken(token);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let body: { data?: Record<string, unknown>; reporter_name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateFormSubmission(resolved.fields, body.data ?? {});
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    const reporterName = String(body.reporter_name ?? "Anonymous").trim() || "Anonymous";

    const { data: submission, error } = await supabase
      .from("company_form_submissions")
      .insert({
        module: "incident",
        template_id: resolved.template_id,
        branch_id: resolved.branch_id,
        data: asJson({ ...validated.data, _reporter_name: reporterName }),
        status: "submitted",
        submitted_at: now,
      })
      .select("id, submitted_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ success: true, submission_id: submission.id, submitted_at: submission.submitted_at });
  } catch {
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
