import type { SupabaseClient } from "@supabase/supabase-js";

import { isoWeekLabel, resolvePeriod, type DateRange } from "@/lib/gm-hr/analytics-period";

export type KpiSummary = {
  total_revenue: number;
  avg_occupancy: number;
  total_negative_feedback: number;
  unpaid_departures: number;
  positive_feedback: number;
  repeated_issues: number;
  support_needed: number;
  reports_submitted: number;
};

export type BranchKpiRow = KpiSummary & {
  branch_id: string;
  branch_name: string;
  revenue: number;
  occupancy_rate: number;
  negative_feedback: number;
  positive_feedback: number;
};

function emptySummary(): KpiSummary {
  return {
    total_revenue: 0,
    avg_occupancy: 0,
    total_negative_feedback: 0,
    unpaid_departures: 0,
    positive_feedback: 0,
    repeated_issues: 0,
    support_needed: 0,
    reports_submitted: 0,
  };
}

function aggregateKpiRows(rows: Record<string, unknown>[]): KpiSummary {
  const s = emptySummary();
  let occSum = 0;
  let occN = 0;
  for (const r of rows) {
    s.total_revenue += Number(r.revenue ?? 0);
    s.total_negative_feedback += Number(r.negative_feedback ?? 0);
    s.unpaid_departures += Number(r.unpaid_departures ?? 0);
    s.positive_feedback += Number(r.positive_feedback ?? 0);
    s.repeated_issues += Number(r.repeated_issues ?? 0);
    s.support_needed += Number(r.support_needed ?? 0);
    if (r.occupancy_rate != null) {
      occSum += Number(r.occupancy_rate);
      occN += 1;
    }
  }
  s.avg_occupancy = occN > 0 ? Math.round((occSum / occN) * 10) / 10 : 0;
  return s;
}

async function hrReportIds(supabase: SupabaseClient): Promise<string[] | null> {
  const { data: tpls } = await supabase.from("templates").select("id").eq("type", "hr");
  const ids = (tpls ?? []).map((t) => t.id);
  if (ids.length === 0) return [];
  const { data: reps } = await supabase.from("reports").select("id").in("template_id", ids);
  return (reps ?? []).map((r) => r.id);
}

async function fetchKpisInRange(
  supabase: SupabaseClient,
  range: DateRange,
  branchId: string | null,
  hrOnly: boolean,
) {
  let q = supabase
    .from("kpis")
    .select(
      "branch_id, revenue, occupancy_rate, negative_feedback, positive_feedback, unpaid_departures, repeated_issues, support_needed, period_start, period_end, created_at, report_id",
    )
    .gte("period_end", range.start)
    .lte("period_end", range.end);

  if (branchId) q = q.eq("branch_id", branchId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let rows = data ?? [];
  if (hrOnly) {
    const reportIds = await hrReportIds(supabase);
    const set = new Set(reportIds ?? []);
    rows = rows.filter((r) => set.has(r.report_id as string));
  }
  return rows;
}

export async function getAnalyticsKpis(
  supabase: SupabaseClient,
  opts: {
    period: string | null;
    start?: string | null;
    end?: string | null;
    branchId: string | null;
    hrOnly: boolean;
  },
) {
  const { current, previous } = resolvePeriod(opts.period, opts.start, opts.end);
  const branchFilter = opts.branchId && opts.branchId !== "all" ? opts.branchId : null;

  const [curRows, prevRows] = await Promise.all([
    fetchKpisInRange(supabase, current, branchFilter, opts.hrOnly),
    fetchKpisInRange(supabase, previous, branchFilter, opts.hrOnly),
  ]);

  const summary = aggregateKpiRows(curRows);
  const previous_period = aggregateKpiRows(prevRows);

  let repQ = supabase
    .from("reports")
    .select("id, branch_id, template_id, submitted_at")
    .in("status", ["submitted", "reviewed"])
    .gte("submitted_at", `${current.start}T00:00:00.000Z`)
    .lte("submitted_at", `${current.end}T23:59:59.999Z`);
  if (branchFilter) repQ = repQ.eq("branch_id", branchFilter);
  const { data: reps } = await repQ;
  let repList = reps ?? [];
  if (opts.hrOnly) {
    const { data: tpls } = await supabase.from("templates").select("id").eq("type", "hr");
    const hrIds = new Set((tpls ?? []).map((t) => t.id));
    repList = repList.filter((r) => hrIds.has(r.template_id as string));
  }
  summary.reports_submitted = repList.length;

  const { data: branches } = await supabase.from("branches").select("id, name");
  const nameMap = new Map((branches ?? []).map((b) => [b.id, b.name]));

  const byBranchMap = new Map<string, Record<string, unknown>[]>();
  for (const r of curRows) {
    const bid = r.branch_id as string;
    if (!byBranchMap.has(bid)) byBranchMap.set(bid, []);
    byBranchMap.get(bid)!.push(r);
  }

  const by_branch: BranchKpiRow[] = [];
  for (const [branch_id, rows] of byBranchMap) {
    const agg = aggregateKpiRows(rows);
    const branchReps = repList.filter((r) => r.branch_id === branch_id);
    by_branch.push({
      ...agg,
      branch_id,
      branch_name: nameMap.get(branch_id) ?? "Branch",
      revenue: agg.total_revenue,
      occupancy_rate: agg.avg_occupancy,
      negative_feedback: agg.total_negative_feedback,
      reports_submitted: branchReps.length,
    });
  }

  return { summary, previous_period, by_branch, period: current };
}

export async function getAnalyticsTrends(
  supabase: SupabaseClient,
  opts: { period: string | null; start?: string | null; end?: string | null; branchId: string | null; hrOnly: boolean },
) {
  const { current } = resolvePeriod(opts.period, opts.start, opts.end);
  const branchFilter = opts.branchId && opts.branchId !== "all" ? opts.branchId : null;
  const rows = await fetchKpisInRange(supabase, current, branchFilter, opts.hrOnly);

  const { data: branches } = await supabase.from("branches").select("id, name");
  const nameMap = new Map((branches ?? []).map((b) => [b.id, b.name]));

  type TrendRow = {
    week: string;
    branch_id: string;
    branch_name: string;
    revenue: number;
    occupancy_rate: number;
  };

  const weekBranch = new Map<string, { revenue: number; occSum: number; occN: number }>();
  const fbMap = new Map<string, { pos: number; neg: number }>();
  const issMap = new Map<string, { rep: number; support: number; unpaid: number }>();

  for (const r of rows) {
    const week = isoWeekLabel(String(r.period_end ?? r.period_start ?? r.created_at).slice(0, 10));
    const bid = r.branch_id as string;
    const key = `${week}|${bid}`;
    const bucket = weekBranch.get(key) ?? { revenue: 0, occSum: 0, occN: 0 };
    bucket.revenue += Number(r.revenue ?? 0);
    if (r.occupancy_rate != null) {
      bucket.occSum += Number(r.occupancy_rate);
      bucket.occN += 1;
    }
    weekBranch.set(key, bucket);

    const fb = fbMap.get(week) ?? { pos: 0, neg: 0 };
    fb.pos += Number(r.positive_feedback ?? 0);
    fb.neg += Number(r.negative_feedback ?? 0);
    fbMap.set(week, fb);

    const iss = issMap.get(week) ?? { rep: 0, support: 0, unpaid: 0 };
    iss.rep += Number(r.repeated_issues ?? 0);
    iss.support += Number(r.support_needed ?? 0);
    iss.unpaid += Number(r.unpaid_departures ?? 0);
    issMap.set(week, iss);
  }

  const trends: TrendRow[] = [];
  for (const [key, bucket] of weekBranch) {
    const parts = key.split("|");
    const week = parts[0] ?? key;
    const branch_id = parts[1] ?? "";
    if (!branch_id) continue;
    trends.push({
      week,
      branch_id,
      branch_name: nameMap.get(branch_id) ?? branch_id,
      revenue: bucket.revenue,
      occupancy_rate: bucket.occN > 0 ? Math.round((bucket.occSum / bucket.occN) * 10) / 10 : 0,
    });
  }

  trends.sort((a, b) => a.week.localeCompare(b.week) || a.branch_name.localeCompare(b.branch_name));

  const feedback_trend = [...fbMap.entries()]
    .map(([week, fb]) => ({ week, positive: fb.pos, negative: fb.neg }))
    .sort((a, b) => a.week.localeCompare(b.week));

  const issues_trend = [...issMap.entries()]
    .map(([week, iss]) => ({
      week,
      repeated_issues: iss.rep,
      support_needed: iss.support,
      unpaid_departures: iss.unpaid,
    }))
    .sort((a, b) => a.week.localeCompare(b.week));

  return { trends, feedback_trend, issues_trend };
}

export async function getAnalyticsComparison(supabase: SupabaseClient, branchIds: string[], hrOnly: boolean) {
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 27);
  const range = { start: start.toISOString().slice(0, 10), end, label: "4w" };

  const { data: branches } = await supabase.from("branches").select("id, name").in("id", branchIds);
  const result = [];

  for (const b of branches ?? []) {
    const rows = await fetchKpisInRange(supabase, range, b.id, hrOnly);
    const agg = aggregateKpiRows(rows);
    const maxRev = 10000;
    const scores = {
      revenue_score: Math.min(100, Math.round((agg.total_revenue / maxRev) * 100)),
      occupancy_score: Math.min(100, Math.round(agg.avg_occupancy)),
      feedback_score: Math.max(0, 100 - agg.total_negative_feedback * 10),
      issue_score: Math.max(0, 100 - agg.repeated_issues * 15),
      support_score: Math.max(0, 100 - agg.support_needed * 15),
    };
    result.push({
      branch_id: b.id,
      branch_name: b.name,
      ...agg,
      radar: scores,
    });
  }

  return { branches: result };
}

export async function getSubmissionRates(supabase: SupabaseClient, hrOnly: boolean) {
  const { data: branches } = await supabase.from("branches").select("id, name");
  const today = new Date().toISOString().slice(0, 10);

  let reqQ = supabase
    .from("report_requests")
    .select("id, branch_id, due_date, status, template_id")
    .lte("due_date", today);
  const { data: requests } = await reqQ;

  let reqs = requests ?? [];
  if (hrOnly) {
    const { data: tpls } = await supabase.from("templates").select("id").eq("type", "hr");
    const hrIds = new Set((tpls ?? []).map((t) => t.id));
    reqs = reqs.filter((r) => hrIds.has(r.template_id as string));
  }

  const rates: { branch_id: string; branch_name: string; rate: number; total: number; on_time: number }[] = [];

  for (const b of branches ?? []) {
    const branchReqs = reqs.filter((r) => r.branch_id === b.id);
    const total = branchReqs.length;
    if (total === 0) {
      rates.push({ branch_id: b.id, branch_name: b.name, rate: 100, total: 0, on_time: 0 });
      continue;
    }
    const on_time = branchReqs.filter((r) => r.status === "submitted").length;
    rates.push({
      branch_id: b.id,
      branch_name: b.name,
      rate: Math.round((on_time / total) * 100),
      total,
      on_time,
    });
  }

  return { rates };
}
