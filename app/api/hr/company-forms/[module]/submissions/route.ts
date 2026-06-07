import { NextResponse } from "next/server";

import { isErrorResponse, parseModuleParam } from "@/lib/company-forms/api-helpers";
import { requireHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

type Params = { params: Promise<{ module: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  const module = parseModuleParam((await params).module);
  if (isErrorResponse(module)) return module;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("company_form_submissions")
      .select(
        `
        id, status, submitted_at, reviewed_at, shift_date, staff_member_id, branch_id,
        company_form_templates ( title ),
        company_form_invites ( subject_name ),
        staff_members ( full_name ),
        branches ( name )
      `,
      )
      .eq("module", module)
      .order("submitted_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const submissions = (data ?? []).map((row) => {
      const template = row.company_form_templates as { title: string } | null;
      const invite = row.company_form_invites as { subject_name: string } | null;
      const staff = row.staff_members as { full_name: string } | null;
      const branch = row.branches as { name: string } | null;
      return {
        id: row.id,
        status: row.status,
        submitted_at: row.submitted_at,
        reviewed_at: row.reviewed_at,
        shift_date: row.shift_date,
        template_title: template?.title ?? null,
        subject_name: invite?.subject_name ?? staff?.full_name ?? null,
        branch_name: branch?.name ?? null,
        staff_member_id: row.staff_member_id,
      };
    });

    return NextResponse.json({ submissions });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
