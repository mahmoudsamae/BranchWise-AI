import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { appBaseUrlFromRequest } from "@/lib/email/app-url";
import { generateFormToken } from "@/lib/company-forms/token";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("branch_incident_tokens")
      .select("token, template_id, is_active, updated_at")
      .eq("branch_id", auth.session.branch_id)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!data) {
      const token = generateFormToken();
      const { data: created, error: createError } = await supabase
        .from("branch_incident_tokens")
        .insert({ branch_id: auth.session.branch_id, token, is_active: true })
        .select("token, is_active, updated_at")
        .single();

      if (createError) return NextResponse.json({ error: createError.message }, { status: 400 });
      const base = appBaseUrlFromRequest(request);
      return NextResponse.json({
        token: created.token,
        link: `${base}/incident/${created.token}`,
        is_active: created.is_active,
      });
    }

    const base = appBaseUrlFromRequest(request);
    return NextResponse.json({
      token: data.token,
      link: `${base}/incident/${data.token}`,
      is_active: data.is_active,
      template_id: data.template_id,
    });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
