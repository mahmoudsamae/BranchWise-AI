import { NextResponse } from "next/server";

import { resolveOnboardingInviteByToken } from "@/lib/onboarding/resolve-invite";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const resolved = await resolveOnboardingInviteByToken(token);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const { invite } = resolved;
  return NextResponse.json({
    employee_name: invite.employee_name,
    template_title: invite.template_title,
    fields: invite.fields,
    status: invite.status,
    expires_at: invite.expires_at,
  });
}
