import { NextResponse } from "next/server";

import { requireHrApi } from "@/lib/gm-hr/require-session";
import { createOnboardingSignedUrl } from "@/lib/onboarding/storage";
import { isOnboardingFileValue, type OnboardingField } from "@/lib/onboarding/template-fields";
import { createServiceRoleClient } from "@/lib/supabase";

type Params = { params: Promise<{ id: string }> };

async function enrichSubmissionData(fields: OnboardingField[], data: Record<string, unknown>) {
  const enriched: Record<string, unknown> = { ...data };
  for (const field of fields) {
    if (field.type !== "file") continue;
    const raw = data[field.id];
    if (!isOnboardingFileValue(raw)) continue;
    const signedUrl = await createOnboardingSignedUrl(raw.path);
    enriched[field.id] = { ...raw, signedUrl };
  }
  return enriched;
}

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("onboarding_submissions")
      .select(
        `
        id,
        data,
        status,
        submitted_at,
        reviewed_at,
        reviewed_by,
        onboarding_invites (
          id,
          employee_name,
          token,
          template_id,
          status,
          expires_at,
          created_at,
          submitted_at,
          onboarding_templates ( title, fields )
        )
      `,
      )
      .eq("id", id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    const invite = data.onboarding_invites as {
      id: string;
      employee_name: string;
      token: string;
      template_id: string;
      status: string;
      expires_at: string;
      created_at: string;
      submitted_at: string | null;
      onboarding_templates: { title: string; fields: unknown } | null;
    } | null;

    const fields = (invite?.onboarding_templates?.fields ?? []) as OnboardingField[];
    const rawData = (data.data ?? {}) as Record<string, unknown>;
    const enrichedData = await enrichSubmissionData(fields, rawData);

    return NextResponse.json({
      submission: {
        id: data.id,
        status: data.status,
        submitted_at: data.submitted_at,
        reviewed_at: data.reviewed_at,
        reviewed_by: data.reviewed_by,
        data: enrichedData,
        fields,
        invite: invite
          ? {
              id: invite.id,
              employee_name: invite.employee_name,
              status: invite.status,
              expires_at: invite.expires_at,
              created_at: invite.created_at,
              submitted_at: invite.submitted_at,
              template_title: invite.onboarding_templates?.title ?? null,
            }
          : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status !== "reviewed") {
    return NextResponse.json({ error: "Only status 'reviewed' is supported" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("onboarding_submissions")
      .update({
        status: "reviewed",
        reviewed_at: now,
        reviewed_by: auth.session.id,
      })
      .eq("id", id)
      .select("id, status, reviewed_at")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    return NextResponse.json({ submission: data });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
