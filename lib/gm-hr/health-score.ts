import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchKpiRow } from "@/lib/gm-hr/analytics-service";

export type HealthScore = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  color: "green" | "yellow" | "red";
  breakdown: {
    submission_rate: number;
    revenue_trend: number;
    occupancy: number;
    feedback: number;
  };
};

export type BranchHealthResult = {
  branch_id: string;
  branch_name: string;
} & HealthScore;

export function calcHealthScore(
  branch: Pick<BranchKpiRow, "total_revenue" | "total_negative_feedback"> & { avg_occupancy: number | null },
  opts: {
    maxRevenue: number;
    submissionRate: number;
    prevRevenue?: number;
  },
): HealthScore {
  const submissionPts = Math.round(opts.submissionRate * 25);

  const revTrend =
    opts.prevRevenue && opts.prevRevenue > 0
      ? (branch.total_revenue - opts.prevRevenue) / opts.prevRevenue
      : 0;
  const revTrendPts = revTrend >= 0 ? 25 : revTrend >= -0.1 ? 20 : revTrend >= -0.2 ? 12 : 0;

  const occPts =
    branch.avg_occupancy == null
      ? 12
      : branch.avg_occupancy > 80
        ? 25
        : branch.avg_occupancy >= 60
          ? 15
          : 5;

  const neg = branch.total_negative_feedback;
  const feedbackPts = neg === 0 ? 25 : neg <= 2 ? 18 : neg <= 5 ? 10 : neg <= 10 ? 5 : 0;

  const score = submissionPts + revTrendPts + occPts + feedbackPts;
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";
  const color = score >= 70 ? "green" : score >= 50 ? "yellow" : "red";

  return {
    score,
    grade,
    color,
    breakdown: {
      submission_rate: submissionPts,
      revenue_trend: revTrendPts,
      occupancy: occPts,
      feedback: feedbackPts,
    },
  };
}

function weekAgoIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString();
}

function twoWeeksAgoIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 14);
  return d.toISOString();
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyKpiBranch(branchId: string, branchName: string): BranchKpiRow {
  return {
    branch_id: branchId,
    branch_name: branchName,
    total_revenue: 0,
    avg_occupancy: 0,
    total_negative_feedback: 0,
    unpaid_departures: 0,
    positive_feedback: 0,
    repeated_issues: 0,
    support_needed: 0,
    reports_submitted: 0,
    revenue: 0,
    occupancy_rate: 0,
    negative_feedback: 0,
  };
}

export async function fetchBranchHealthScores(
  supabase: SupabaseClient,
  opts: { hrOnly?: boolean } = {},
): Promise<BranchHealthResult[]> {
  const weekAgo = weekAgoIso();
  const twoWeeksAgo = twoWeeksAgoIso();
  const today = todayDate();
  const hrOnly = opts.hrOnly === true;

  let templateIdsHr: string[] | null = null;
  if (hrOnly) {
    const { data: tpls } = await supabase.from("templates").select("id").eq("type", "hr");
    templateIdsHr = (tpls ?? []).map((t) => t.id as string);
    if (templateIdsHr.length === 0) return [];
  }

  const [{ data: branches }, { data: kpisWeek }, { data: kpisPrev }, { data: requests }] = await Promise.all([
    supabase.from("branches").select("id, name").order("name"),
    supabase
      .from("kpis")
      .select("branch_id, revenue, occupancy_rate, negative_feedback, created_at")
      .gte("created_at", weekAgo),
    supabase
      .from("kpis")
      .select("branch_id, revenue, created_at")
      .gte("created_at", twoWeeksAgo)
      .lt("created_at", weekAgo),
    supabase
      .from("report_requests")
      .select("branch_id, status, due_date, template_id")
      .lte("due_date", today),
  ]);

  let reqs = requests ?? [];
  if (hrOnly && templateIdsHr) {
    const hrIds = new Set(templateIdsHr);
    reqs = reqs.filter((r) => hrIds.has(r.template_id as string));
  }

  const weekAgg = new Map<string, { revenue: number; neg: number; occSum: number; occCount: number }>();
  for (const k of kpisWeek ?? []) {
    const bid = k.branch_id as string;
    const prev = weekAgg.get(bid) ?? { revenue: 0, neg: 0, occSum: 0, occCount: 0 };
    prev.revenue += Number(k.revenue ?? 0);
    prev.neg += Number(k.negative_feedback ?? 0);
    if (k.occupancy_rate != null) {
      prev.occSum += Number(k.occupancy_rate);
      prev.occCount += 1;
    }
    weekAgg.set(bid, prev);
  }

  const prevRevenueByBranch = new Map<string, number>();
  for (const k of kpisPrev ?? []) {
    const bid = k.branch_id as string;
    prevRevenueByBranch.set(bid, (prevRevenueByBranch.get(bid) ?? 0) + Number(k.revenue ?? 0));
  }

  const kpiRows: BranchKpiRow[] = (branches ?? []).map((b) => {
    const agg = weekAgg.get(b.id as string);
    const hasOcc = Boolean(agg && agg.occCount > 0);
    const avgOcc = hasOcc ? Math.round((agg!.occSum / agg!.occCount) * 10) / 10 : 0;
    const row = {
      ...emptyKpiBranch(b.id as string, String(b.name)),
      total_revenue: agg?.revenue ?? 0,
      total_negative_feedback: agg?.neg ?? 0,
      revenue: agg?.revenue ?? 0,
      occupancy_rate: avgOcc,
      negative_feedback: agg?.neg ?? 0,
      avg_occupancy: avgOcc,
    };
    return row;
  });

  const maxRevenue = Math.max(0, ...kpiRows.map((r) => r.total_revenue));

  return kpiRows.map((row) => {
    const branchReqs = reqs.filter((r) => r.branch_id === row.branch_id);
    const total = branchReqs.length;
    const submissionRate = total === 0 ? 1 : branchReqs.filter((r) => r.status === "submitted").length / total;
    const agg = weekAgg.get(row.branch_id);
    const hasOcc = Boolean(agg && agg.occCount > 0);

    const health = calcHealthScore(
      {
        total_revenue: row.total_revenue,
        total_negative_feedback: row.total_negative_feedback,
        avg_occupancy: hasOcc ? row.avg_occupancy : null,
      },
      {
        maxRevenue,
        submissionRate,
        prevRevenue: prevRevenueByBranch.get(row.branch_id),
      },
    );

    return {
      branch_id: row.branch_id,
      branch_name: row.branch_name,
      ...health,
    };
  });
}
