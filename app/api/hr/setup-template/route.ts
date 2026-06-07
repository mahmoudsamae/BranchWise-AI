import { NextResponse } from "next/server";

import { HR_DEFAULT_TEMPLATE, HR_DEFAULT_TEMPLATE_ID } from "@/lib/hr/default-template";
import { requireHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

/** Ensures default HR template exists in `templates` (not legacy report_templates). */
export async function GET() {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();

    const { data: existing } = await supabase
      .from("templates")
      .select("id, title, type")
      .eq("type", "hr")
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return NextResponse.json({
        created: false,
        template_id: existing.id,
        title: existing.title,
      });
    }

    const { data, error } = await supabase
      .from("templates")
      .upsert(
        {
          id: HR_DEFAULT_TEMPLATE_ID,
          title: HR_DEFAULT_TEMPLATE.title,
          type: HR_DEFAULT_TEMPLATE.type,
          fields: HR_DEFAULT_TEMPLATE.fields,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      )
      .select("id, title, type")
      .single();

    if (error) {
      console.error("[GET /api/hr/setup-template]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      created: true,
      template_id: data.id,
      title: data.title,
    });
  } catch (e) {
    console.error("[GET /api/hr/setup-template]", e);
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }
}
