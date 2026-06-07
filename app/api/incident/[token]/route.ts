import { NextResponse } from "next/server";

import { resolveIncidentByBranchToken } from "@/lib/company-forms/resolve-invite";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const resolved = await resolveIncidentByBranchToken(token);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  return NextResponse.json({
    module: "incident",
    branch_name: resolved.branch_name,
    template_title: resolved.template_title,
    fields: resolved.fields,
    settings: resolved.settings,
  });
}
