import type { SupabaseClient } from "@supabase/supabase-js";

import { fetchBranchHealthScores } from "@/lib/gm-hr/health-score";

export type DashboardStats = {
  open_requests: number;
  overdue_reports: number;
  pending_review: number;
  submitted_this_week: number;
  revenue_week: number;
  avg_occupancy: number | null;
  negative_feedback_week: number;
  unread_messages: number;
  overdue_branches: { branch_id: string; branch_name: string; days_overdue: number; request_id: string }[];
  low_occupancy_branches: { branch_id: string; branch_name: string; occupancy_rate: number }[];
  active_requests: {
    id: string;
    title: string;
    branch_name: string;
    template_title: string;
    period_start: string;
    period_end: string;
    due_date: string;
    status: string;
    submitted_count: number;
    total_branches: number;
  }[];
  branch_snapshots: {
    branch_id: string;
    branch_name: string;
    last_report_at: string | null;
    status: string | null;
    occupancy_rate: number | null;
    revenue: number | null;
    health: "green" | "yellow" | "red";
    health_score: number;
    health_grade: string;
  }[];
};

function weekAgoIso() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString();
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function fetchDashboardStats(
  supabase: SupabaseClient,
  opts: { hrOnly?: boolean; gmUserId?: string },
): Promise<DashboardStats> {
  const today = todayDate();
  const weekAgo = weekAgoIso();
  const hrOnly = opts.hrOnly === true;

  let templateIdsHr: string[] | null = null;
  if (hrOnly) {
    const { data: tpls } = await supabase.from("templates").select("id").eq("type", "hr");
    templateIdsHr = (tpls ?? []).map((t) => t.id);
    if (templateIdsHr.length === 0) {
      return emptyStats();
    }
  }

  let reqQ = supabase
    .from("report_requests")
    .select("id, title, status, due_date, period_start, period_end, branch_id, template_id")
    .eq("status", "pending");
  if (hrOnly && templateIdsHr) reqQ = reqQ.in("template_id", templateIdsHr);
  const { data: pendingReqs } = await reqQ;

  const open_requests = pendingReqs?.length ?? 0;

  let overdueReqs = (pendingReqs ?? []).filter((r) => String(r.due_date) < today);
  const overdue_reports = overdueReqs.length;

  let repQ = supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "submitted");
  if (hrOnly && templateIdsHr) repQ = repQ.in("template_id", templateIdsHr);
  const { count: pendingReview } = await repQ;

  let subQ = supabase
    .from("reports")
    .select("*", { count: "exact", head: true })
    .eq("status", "submitted")
    .gte("submitted_at", weekAgo);
  if (hrOnly && templateIdsHr) subQ = subQ.in("template_id", templateIdsHr);
  const { count: submittedWeek } = await subQ;

  let kpiQ = supabase
    .from("kpis")
    .select("revenue, occupancy_rate, negative_feedback, branch_id, created_at")
    .gte("created_at", weekAgo);
  const { data: kpisWeek } = await kpiQ;

  let revenue_week = 0;
  let occSum = 0;
  let occCount = 0;
  let negative_feedback_week = 0;
  const occByBranch = new Map<string, number>();

  for (const k of kpisWeek ?? []) {
    revenue_week += Number(k.revenue ?? 0);
    negative_feedback_week += Number(k.negative_feedback ?? 0);
    if (k.occupancy_rate != null) {
      occSum += Number(k.occupancy_rate);
      occCount += 1;
      occByBranch.set(k.branch_id as string, Number(k.occupancy_rate));
    }
  }
  const avg_occupancy = occCount > 0 ? Math.round((occSum / occCount) * 10) / 10 : null;

  let unread_messages = 0;
  if (opts.gmUserId) {
    const { data: channels } = await supabase.from("branch_channels").select("id");
    const channelIds = (channels ?? []).map((c) => c.id);
    if (channelIds.length > 0) {
      const { data: reads } = await supabase
        .from("branch_channel_reads")
        .select("channel_id, last_read_at")
        .eq("user_id", opts.gmUserId)
        .in("channel_id", channelIds);
      const readMap = new Map((reads ?? []).map((r) => [r.channel_id, r.last_read_at]));
      for (const cid of channelIds) {
        const since = readMap.get(cid) ?? "1970-01-01T00:00:00.000Z";
        const { count } = await supabase
          .from("branch_messages")
          .select("*", { count: "exact", head: true })
          .eq("channel_id", cid)
          .gt("created_at", since);
        unread_messages += count ?? 0;
      }
    }
  }

  const { data: branches } = await supabase.from("branches").select("id, name").order("name");
  const branchName = new Map((branches ?? []).map((b) => [b.id, b.name]));

  const overdue_branches = overdueReqs.map((r) => {
    const due = String(r.due_date);
    const diff = Math.floor((Date.parse(today) - Date.parse(due)) / 86400000);
    return {
      branch_id: r.branch_id as string,
      branch_name: branchName.get(r.branch_id as string) ?? "Branch",
      days_overdue: Math.max(1, diff),
      request_id: r.id as string,
    };
  });

  const low_occupancy_branches: DashboardStats["low_occupancy_branches"] = [];
  for (const [branch_id, occupancy_rate] of occByBranch) {
    if (occupancy_rate < 60) {
      low_occupancy_branches.push({
        branch_id,
        branch_name: branchName.get(branch_id) ?? "Branch",
        occupancy_rate,
      });
    }
  }

  const templateIds = [...new Set((pendingReqs ?? []).map((r) => r.template_id).filter(Boolean))] as string[];
  const { data: templates } =
    templateIds.length > 0
      ? await supabase.from("templates").select("id, title").in("id", templateIds)
      : { data: [] };
  const tplTitle = new Map((templates ?? []).map((t) => [t.id, t.title]));

  const active_requests = (pendingReqs ?? []).slice(0, 20).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    branch_name: branchName.get(r.branch_id as string) ?? "—",
    template_title: tplTitle.get(r.template_id as string) ?? "—",
    period_start: String(r.period_start),
    period_end: String(r.period_end),
    due_date: String(r.due_date),
    status: r.status as string,
    submitted_count: 0,
    total_branches: 1,
  }));

  const branch_snapshots: DashboardStats["branch_snapshots"] = [];
  const healthScores = await fetchBranchHealthScores(supabase, { hrOnly });
  const healthByBranch = new Map(healthScores.map((h) => [h.branch_id, h]));

  for (const b of branches ?? []) {
    let lastRepQ = supabase
      .from("reports")
      .select("submitted_at, status")
      .eq("branch_id", b.id)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false })
      .limit(1);
    if (hrOnly && templateIdsHr?.length) lastRepQ = lastRepQ.in("template_id", templateIdsHr);
    const { data: lastRep } = await lastRepQ.maybeSingle();

    const { data: lastKpi } = await supabase
      .from("kpis")
      .select("revenue, occupancy_rate, negative_feedback")
      .eq("branch_id", b.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const occ = lastKpi?.occupancy_rate != null ? Number(lastKpi.occupancy_rate) : null;
    const healthResult = healthByBranch.get(b.id as string);

    branch_snapshots.push({
      branch_id: b.id,
      branch_name: b.name,
      last_report_at: lastRep?.submitted_at ?? null,
      status: lastRep?.status ?? null,
      occupancy_rate: occ,
      revenue: lastKpi?.revenue != null ? Number(lastKpi.revenue) : null,
      health: healthResult?.color ?? "yellow",
      health_score: healthResult?.score ?? 0,
      health_grade: healthResult?.grade ?? "F",
    });
  }

  branch_snapshots.sort((a, b) => a.health_score - b.health_score);

  return {
    open_requests,
    overdue_reports,
    pending_review: pendingReview ?? 0,
    submitted_this_week: submittedWeek ?? 0,
    revenue_week,
    avg_occupancy,
    negative_feedback_week,
    unread_messages,
    overdue_branches,
    low_occupancy_branches,
    active_requests,
    branch_snapshots,
  };
}

function emptyStats(): DashboardStats {
  return {
    open_requests: 0,
    overdue_reports: 0,
    pending_review: 0,
    submitted_this_week: 0,
    revenue_week: 0,
    avg_occupancy: null,
    negative_feedback_week: 0,
    unread_messages: 0,
    overdue_branches: [],
    low_occupancy_branches: [],
    active_requests: [],
    branch_snapshots: [],
  };
}
