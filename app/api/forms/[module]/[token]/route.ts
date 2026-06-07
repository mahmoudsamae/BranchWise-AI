import { NextResponse } from "next/server";

import { isErrorResponse, parseModuleParam } from "@/lib/company-forms/api-helpers";
import { resolveCompanyFormInvite } from "@/lib/company-forms/resolve-invite";

type Params = { params: Promise<{ module: string; token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { module: moduleRaw, token } = await params;
  const module = parseModuleParam(moduleRaw);
  if (isErrorResponse(module)) return module;

  const resolved = await resolveCompanyFormInvite(module, token);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const { invite } = resolved;
  return NextResponse.json({
    module: invite.module,
    subject_name: invite.subject_name,
    template_title: invite.template_title,
    fields: invite.fields,
    settings: invite.settings,
    status: invite.status,
    expires_at: invite.expires_at,
  });
}
