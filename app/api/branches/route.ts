import { NextResponse } from "next/server";

import { requireGmHrOrSuperAdminApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET() {
  const auth = await requireGmHrOrSuperAdminApi();
  if (!auth.ok) return auth.response;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("branches")
    .select("id, name, location, is_active, external_id")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("[branches] error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ branches: data });
}
