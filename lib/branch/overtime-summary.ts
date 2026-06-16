import { createServiceRoleClient } from "@/lib/supabase";
import { entryInPeriod } from "@/lib/staff/period";

export type OvertimeSummary = {
  monthHours: number;
  nearLimitCount: number;
  lastUpdated: string | null;
  monthLabel: string;
};

const NEAR_LIMIT_THRESHOLD_HOURS = 10;

function currentMonthRange(): { start: string; end: string; label: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(now);
  return { start: iso(start), end: iso(end), label };
}

export async function getOvertimeSummary(branchId: string): Promise<OvertimeSummary> {
  const supabase = createServiceRoleClient();
  const { start, end, label } = currentMonthRange();

  const { data: entries } = await supabase
    .from("staff_report_entries")
    .select("staff_member_id, overtime_hours, week_start, period_end, created_at")
    .eq("branch_id", branchId)
    .lte("week_start", end);

  const inMonth = (entries ?? []).filter((e) =>
    entryInPeriod(String(e.week_start), e.period_end as string | null, start, end),
  );

  let monthHours = 0;
  let lastUpdated: string | null = null;
  const byStaff = new Map<string, number>();

  for (const e of inMonth) {
    const ot = Number(e.overtime_hours ?? 0);
    monthHours += ot;
    if (e.staff_member_id) {
      byStaff.set(e.staff_member_id, (byStaff.get(e.staff_member_id) ?? 0) + ot);
    }
    if (e.created_at && (!lastUpdated || e.created_at > lastUpdated)) {
      lastUpdated = e.created_at;
    }
  }

  const nearLimitCount = [...byStaff.values()].filter((h) => h > NEAR_LIMIT_THRESHOLD_HOURS).length;

  return {
    monthHours: Math.round(monthHours * 10) / 10,
    nearLimitCount,
    lastUpdated,
    monthLabel: label,
  };
}
