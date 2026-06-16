import { NextResponse } from "next/server";

import { isDemoSession } from "@/lib/demo/guard";
import { demoSubmissionRates } from "@/lib/demo/mock-data";
import { getSubmissionRates } from "@/lib/gm-hr/analytics-service";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET() {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;
  if (isDemoSession(auth.session)) return NextResponse.json(demoSubmissionRates());

  try {
    const supabase = createServiceRoleClient();
    const data = await getSubmissionRates(supabase, auth.session.role === "hr");
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
