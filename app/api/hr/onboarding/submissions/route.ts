import { NextResponse } from "next/server";

import { requireHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET() {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("onboarding_submissions")
      .select(
        `
        id,
        status,
        submitted_at,
        reviewed_at,
        onboarding_invites (
          id,
          employee_name,
          template_id,
          created_at,
          onboarding_templates ( title )
        )
      `,
      )
      .order("submitted_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const submissions = (data ?? []).map((row) => {
      const invite = row.onboarding_invites as {
        id: string;
        employee_name: string;
        template_id: string;
        created_at: string;
        onboarding_templates: { title: string } | null;
      } | null;
      return {
        id: row.id,
        status: row.status,
        submitted_at: row.submitted_at,
        reviewed_at: row.reviewed_at,
        employee_name: invite?.employee_name ?? null,
        template_title: invite?.onboarding_templates?.title ?? null,
        invite_id: invite?.id ?? null,
        invite_created_at: invite?.created_at ?? null,
      };
    });

    return NextResponse.json({ submissions });
  } catch {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
