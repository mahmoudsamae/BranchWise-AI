import { NextResponse } from "next/server";

import { resolveOnboardingInviteByToken } from "@/lib/onboarding/resolve-invite";
import { validateOnboardingSubmission } from "@/lib/onboarding/validate-submission";
import { createServiceRoleClient } from "@/lib/supabase";
import { asJson } from "@/lib/supabase-json";

type Params = { params: Promise<{ token: string }> };

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const resolved = await resolveOnboardingInviteByToken(token);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  let body: { data?: Record<string, unknown> };
  try {
    body = (await request.json()) as { data?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateOnboardingSubmission(resolved.invite.fields, body.data ?? {});
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();

    const { data: submission, error: submissionError } = await supabase
      .from("onboarding_submissions")
      .insert({
        invite_id: resolved.invite.id,
        data: asJson(validated.data),
        status: "submitted",
        submitted_at: now,
      })
      .select("id, submitted_at")
      .single();

    if (submissionError) {
      return NextResponse.json({ error: submissionError.message }, { status: 400 });
    }

    await supabase
      .from("onboarding_invites")
      .update({ status: "submitted", submitted_at: now })
      .eq("id", resolved.invite.id);

    return NextResponse.json({
      success: true,
      submission_id: submission.id,
      submitted_at: submission.submitted_at,
    });
  } catch {
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
