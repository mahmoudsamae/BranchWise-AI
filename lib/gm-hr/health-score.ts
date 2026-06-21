import type { SupabaseClient } from "@supabase/supabase-js";

import type { BranchKpiRow } from "@/lib/gm-hr/analytics-service";

export type HealthScore = {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  color: "green" | "yellow" | "red";
  breakdown: {
    submission_rate: number;
    occupancy: number;
    feedback: number;
  };
};

export type BranchHealthResult = {
  branch_id: string;
  branch_name: string;
} & HealthScore;

export function calcHealthScore(
  branch: Pick<BranchKpiRow, "total_negative_feedback"> & { avg_occupancy: number | null },
  opts: {
    submissionRate: number;
  },
): HealthScore {
  const submissionPts = Math.round(opts.submissionRate * 35);

  const occPts =
    branch.avg_occupancy == null
      ? 18
      : branch.avg_occupancy > 80
        ? 35
        : branch.avg_occupancy >= 60
          ? 22
          : 8;

  const neg = branch.total_negative_feedback;
  const feedbackPts = neg === 0 ? 30 : neg <= 2 ? 22 : neg <= 5 ? 14 : neg <= 10 ? 6 : 0;

  const score = submissionPts + occPts + feedbackPts;
  const grade = score >= 85 ? "A" : score >= 70 ? "B" : score >= 55 ? "C" : score >= 40 ? "D" : "F";
  const color = score >= 70 ? "green" : score >= 50 ? "yellow" : "red";

  return {
    score,
    grade,
    color,
    breakdown: {
      submission_rate: submissionPts,
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

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyKpiBranch(branchId: string, branchName: string): BranchKpiRow {
  return {
    branch_id: branchId,
    branch_name: branchName,
    avg_occupancy: 0,
    total_negative_feedback: 0,
    unpaid_departures: 0,
    positive_feedback: 0,
    repeated_issues: 0,
    support_needed: 0,
    reports_submitted: 0,
    occupancy_rate: 0,
    negative_feedback: 0,
  };
}

export async function fetchBranchHealthScores(
  supabase: SupabaseClient,
  opts: { hrOnly?: boolean } = {},
): Promise<BranchHealthResult[]> {
  const weekAgo = weekAgoIso();
  const today = todayDate();
  const hrOnly = opts.hrOnly === true;

  let templateIdsHr: string[] | null = null;
  if (hrOnly) {
    const { data: tpls } = await supabase.from("templates").select("id").eq("type", "hr");
    templateIdsHr = (tpls ?? []).map((t) => t.id as string);
    if (templateIdsHr.length === 0) return [];
  }

  const [{ data: branches }, { data: kpisWeek }, { data: requests }] = await Promise.all([
    supabase.from("branches").select("id, name").order("name"),
    supabase
      .from("kpis")
      .select("branch_id, occupancy_rate, negative_feedback, created_at")
      .gte("created_at", weekAgo),
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

  const weekAgg = new Map<string, { neg: number; occSum: number; occCount: number }>();
  for (const k of kpisWeek ?? []) {
    const bid = k.branch_id as string;
    const prev = weekAgg.get(bid) ?? { neg: 0, occSum: 0, occCount: 0 };
    prev.neg += Number(k.negative_feedback ?? 0);
    if (k.occupancy_rate != null) {
      prev.occSum += Number(k.occupancy_rate);
      prev.occCount += 1;
    }
    weekAgg.set(bid, prev);
  }

  const kpiRows: BranchKpiRow[] = (branches ?? []).map((b) => {
    const agg = weekAgg.get(b.id as string);
    const hasOcc = Boolean(agg && agg.occCount > 0);
    const avgOcc = hasOcc ? Math.round((agg!.occSum / agg!.occCount) * 10) / 10 : 0;
    return {
      ...emptyKpiBranch(b.id as string, String(b.name)),
      total_negative_feedback: agg?.neg ?? 0,
      occupancy_rate: avgOcc,
      negative_feedback: agg?.neg ?? 0,
      avg_occupancy: avgOcc,
    };
  });

  return kpiRows.map((row) => {
    const branchReqs = reqs.filter((r) => r.branch_id === row.branch_id);
    const total = branchReqs.length;
    const submissionRate = total === 0 ? 1 : branchReqs.filter((r) => r.status === "submitted").length / total;
    const agg = weekAgg.get(row.branch_id);
    const hasOcc = Boolean(agg && agg.occCount > 0);

    const health = calcHealthScore(
      {
        total_negative_feedback: row.total_negative_feedback,
        avg_occupancy: hasOcc ? row.avg_occupancy : null,
      },
      { submissionRate },
    );

    return {
      branch_id: row.branch_id,
      branch_name: row.branch_name,
      ...health,
    };
  });
}
