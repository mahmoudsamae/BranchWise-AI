import { NextResponse } from "next/server";

import { isErrorResponse, parseModuleParam } from "@/lib/company-forms/api-helpers";
import { trackDocumentFromSubmission } from "@/lib/company-forms/document-tracking";
import { resolveCompanyFormInvite } from "@/lib/company-forms/resolve-invite";
import { validateFormSubmission } from "@/lib/company-forms/validate-submission";
import { createServiceRoleClient } from "@/lib/supabase";
import { asJson } from "@/lib/supabase-json";

type Params = { params: Promise<{ module: string; token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { module: moduleRaw, token } = await params;
  const module = parseModuleParam(moduleRaw);
  if (isErrorResponse(module)) return module;

  const resolved = await resolveCompanyFormInvite(module, token);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let body: { data?: Record<string, unknown> };
  try {
    body = (await request.json()) as { data?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateFormSubmission(resolved.invite.fields, body.data ?? {});
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const submissionStatus = module === "policy" ? "acknowledged" : "submitted";
  const inviteStatus = module === "policy" ? "acknowledged" : "submitted";

  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    const { data: submission, error: submissionError } = await supabase
      .from("company_form_submissions")
      .insert({
        module,
        template_id: resolved.invite.template_id,
        invite_id: resolved.invite.id,
        staff_member_id: resolved.invite.staff_member_id,
        branch_id: resolved.invite.branch_id,
        data: asJson(validated.data),
        status: submissionStatus,
        submitted_at: now,
      })
      .select("id, submitted_at")
      .single();

    if (submissionError) {
      return NextResponse.json({ error: submissionError.message }, { status: 400 });
    }

    await supabase
      .from("company_form_invites")
      .update({ status: inviteStatus, submitted_at: now })
      .eq("id", resolved.invite.id);

    await trackDocumentFromSubmission({
      module,
      submissionId: submission.id,
      staffMemberId: resolved.invite.staff_member_id,
      templateTitle: resolved.invite.template_title,
      fields: resolved.invite.fields,
      data: validated.data,
      settings: resolved.invite.settings,
      submittedAt: now,
    });

    return NextResponse.json({
      success: true,
      submission_id: submission.id,
      submitted_at: submission.submitted_at,
    });
  } catch {
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
