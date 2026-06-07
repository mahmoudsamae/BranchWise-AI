import { NextResponse } from "next/server";

import { requireGeneralManagerApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: Request) {
  const auth = await requireGeneralManagerApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 14)));
  const branchParam = url.searchParams.get("branch_id") ?? "all";

  const end = new Date();
  const start = new Date();
  start.setUTCDate(end.getUTCDate() - (days - 1));
  const startDate = start.toISOString().slice(0, 10);

  try {
    const supabase = createServiceRoleClient();

    let query = supabase
      .from("fruhstuck_data")
      .select("date, orders_count, branch_id, branches(name)")
      .gte("date", startDate)
      .order("date", { ascending: true });

    if (branchParam !== "all") query = query.eq("branch_id", branchParam);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const byDate = new Map<string, Record<string, number>>();
    const branchNames = new Map<string, string>();

    for (const row of data ?? []) {
      const dateKey = String(row.date);
      const bid = row.branch_id as string;
      const branch = row.branches as { name?: string } | { name?: string }[] | null;
      const name = Array.isArray(branch) ? branch[0]?.name ?? bid : branch?.name ?? bid;
      branchNames.set(bid, name);

      if (!byDate.has(dateKey)) byDate.set(dateKey, {});
      const bucket = byDate.get(dateKey)!;
      bucket[name] = (bucket[name] ?? 0) + Number(row.orders_count);
    }

    const series = [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }));

    return NextResponse.json({
      days,
      series,
      branches: [...branchNames.entries()].map(([id, name]) => ({ id, name })),
    });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
