import { NextResponse } from "next/server";

import { requireBranchManagerApi } from "@/lib/branch/require-session";
import { isDemoSession } from "@/lib/demo/guard";
import { demoBranchBreakfast } from "@/lib/demo/mock-data";
import { loadBranchBreakfastAnalytics } from "@/lib/fruhstuck/load-branch-breakfast";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);

  if (isDemoSession(auth.session)) {
    return NextResponse.json(
      demoBranchBreakfast(url.searchParams.get("range"), url.searchParams.get("compare")),
    );
  }

  const result = await loadBranchBreakfastAnalytics(
    auth.session.branch_id,
    url.searchParams.get("range"),
    url.searchParams.get("start_date"),
    url.searchParams.get("end_date"),
    url.searchParams.get("compare"),
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
