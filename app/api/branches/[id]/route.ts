import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api/validate-body";
import { requireGeneralManagerOrSuperAdminApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

const branchExternalIdBodySchema = z.object({
  external_id: z
    .string()
    .nullable()
    .transform((value) => (value === null ? null : value.trim().toLowerCase() || null)),
});

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, ctx: RouteCtx) {
  const auth = await requireGeneralManagerOrSuperAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(branchExternalIdBodySchema, raw);
  if (!parsed.ok) return parsed.response;

  const { external_id: externalId } = parsed.data;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("branches")
      .update({ external_id: externalId })
      .eq("id", id)
      .select("id, name, location, external_id, is_active")
      .single();

    if (error) {
      console.error("[PATCH /api/branches/[id]] error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ branch: data });
  } catch (e) {
    console.error("[PATCH /api/branches/[id]] exception:", e);
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
