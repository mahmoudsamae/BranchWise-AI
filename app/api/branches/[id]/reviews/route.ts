import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { resolveBranchReviews } from "@/lib/google/resolve-branch-reviews";
import { requireGmHrOrSuperAdminApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  const { id } = await ctx.params;

  const elevated = await requireGmHrOrSuperAdminApi();
  if (!elevated.ok) {
    const branchAuth = await requireBranchManagerApi();
    if (!branchAuth.ok) {
      return elevated.response.status === 401 ? elevated.response : branchAuth.response;
    }
    if (branchAuth.session.branch_id !== id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const supabase = createServiceRoleClient();
    const { data: branch, error } = await supabase
      .from("branches")
      .select("id, name, google_place_id, google_maps_url")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      if (error.code === "42703") {
        return NextResponse.json(
          { configured: false, migrationRequired: true, error: "Datenbank-Migration fehlt." },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!branch) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const resolved = await resolveBranchReviews(branch);

    if (resolved.status === "migration_required") {
      return NextResponse.json(
        { configured: false, migrationRequired: true, error: "Datenbank-Migration fehlt." },
        { status: 503 },
      );
    }

    if (resolved.status === "not_configured") {
      return NextResponse.json({ configured: false, branchName: branch.name });
    }

    if (resolved.status === "error") {
      return NextResponse.json(
        {
          configured: true,
          apiConfigured: false,
          branchName: branch.name,
          placeId: branch.google_place_id,
          error: resolved.error,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      configured: true,
      apiConfigured: true,
      isDemo: resolved.isDemo,
      branchName: branch.name,
      branchId: branch.id,
      ...resolved.data,
    });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
