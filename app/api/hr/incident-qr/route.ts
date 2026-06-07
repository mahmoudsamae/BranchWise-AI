import { NextResponse } from "next/server";

import { appBaseUrlFromRequest } from "@/lib/email/app-url";
import { generateFormToken } from "@/lib/company-forms/token";
import { requireHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data: branches, error: branchesError } = await supabase
      .from("branches")
      .select("id, name")
      .order("name", { ascending: true });

    if (branchesError) return NextResponse.json({ error: branchesError.message }, { status: 500 });

    const { data: tokens, error: tokensError } = await supabase
      .from("branch_incident_tokens")
      .select("branch_id, token, is_active, template_id");

    if (tokensError) return NextResponse.json({ error: tokensError.message }, { status: 500 });

    const tokenByBranch = new Map((tokens ?? []).map((t) => [t.branch_id, t]));
    const base = appBaseUrlFromRequest(request);

    const rows = (branches ?? []).map((b) => {
      const t = tokenByBranch.get(b.id);
      return {
        branch_id: b.id,
        branch_name: b.name,
        branch_code: null,
        token: t?.token ?? null,
        link: t?.token ? `${base}/incident/${t.token}` : null,
        is_active: t?.is_active ?? false,
        template_id: t?.template_id ?? null,
      };
    });

    return NextResponse.json({ branches: rows });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  let body: { branch_id?: string; template_id?: string | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const branchId = String(body.branch_id ?? "").trim();
  if (!branchId) return NextResponse.json({ error: "branch_id is required" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const { data: existing } = await supabase
      .from("branch_incident_tokens")
      .select("branch_id")
      .eq("branch_id", branchId)
      .maybeSingle();

    const token = generateFormToken();
    const patch = {
      token,
      template_id: body.template_id ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase.from("branch_incident_tokens").update(patch).eq("branch_id", branchId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const { error } = await supabase.from("branch_incident_tokens").insert({ branch_id: branchId, ...patch });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const base = appBaseUrlFromRequest(request);
    return NextResponse.json({ link: `${base}/incident/${token}`, token });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
