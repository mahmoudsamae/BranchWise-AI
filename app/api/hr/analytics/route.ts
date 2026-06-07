import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchHrAnalytics } from "@/lib/hr/analytics-service";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

const hrAnalyticsQuerySchema = z.object({
  period: z.enum(["week", "month", "custom"]).default("week"),
  start_date: z.string().trim().optional(),
  end_date: z.string().trim().optional(),
  branch_id: z.string().trim().optional(),
});

export async function GET(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const params = new URL(request.url).searchParams;
  const parsed = hrAnalyticsQuerySchema.safeParse({
    period: params.get("period")?.trim() || undefined,
    start_date: params.get("start_date") ?? undefined,
    end_date: params.get("end_date") ?? undefined,
    branch_id: params.get("branch_id") ?? undefined,
  });

  if (!parsed.success) {
    const message = parsed.error.issues.map((e) => e.message).join(", ");
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { period, start_date: startYmd, end_date: endYmd, branch_id: branchIdRaw } = parsed.data;

  if (period === "custom" && (!startYmd || !endYmd)) {
    return NextResponse.json({ error: "Custom period requires start_date and end_date" }, { status: 400 });
  }

  try {
    const supabase = createServiceRoleClient();
    const data = await fetchHrAnalytics(supabase, {
      period,
      startYmd,
      endYmd,
      branchId: branchIdRaw === "all" ? null : (branchIdRaw ?? null),
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("[GET /api/hr/analytics]", e);
    return NextResponse.json({ error: "Failed to load HR analytics" }, { status: 500 });
  }
}
