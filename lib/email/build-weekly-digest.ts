import type { SupabaseClient } from "@supabase/supabase-js";

import { appBaseUrl } from "@/lib/email/app-url";
import type { WeeklyDigestPayload } from "@/lib/email/send-weekly-digest";
import { fetchBranchHealthScores } from "@/lib/gm-hr/health-score";

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function weekAgoIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 7);
  return d.toISOString();
}

export function currentWeekLabel(): string {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 6);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(d);
  return `${fmt(start)} – ${fmt(end)}`;
}

export async function buildWeeklyDigest(supabase: SupabaseClient): Promise<WeeklyDigestPayload> {
  const today = todayDate();
  const weekAgo = weekAgoIso();

  const [{ count: submittedThisWeek }, { data: pendingReqs }, { data: branches }, { data: weekReports }, { data: kpisWeek }] =
    await Promise.all([
      supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .in("status", ["submitted", "reviewed"])
        .gte("submitted_at", weekAgo),
      supabase.from("report_requests").select("id, due_date").eq("status", "pending"),
      supabase.from("branches").select("id, name").order("name"),
      supabase
        .from("reports")
        .select("branch_id")
        .in("status", ["submitted", "reviewed"])
        .gte("submitted_at", weekAgo),
      supabase
        .from("kpis")
        .select("branch_id, occupancy_rate, created_at")
        .gte("created_at", weekAgo),
    ]);

  const branchName = new Map((branches ?? []).map((b) => [b.id as string, String(b.name)]));
  const submittedBranchIds = new Set((weekReports ?? []).map((r) => r.branch_id as string));

  const noSubmissionBranches = (branches ?? [])
    .filter((b) => !submittedBranchIds.has(b.id as string))
    .map((b) => String(b.name));

  const totalOverdue = (pendingReqs ?? []).filter((r) => String(r.due_date) < today).length;

  const occSumByBranch = new Map<string, { sum: number; count: number }>();

  for (const k of kpisWeek ?? []) {
    const bid = k.branch_id as string;
    if (k.occupancy_rate != null) {
      const prev = occSumByBranch.get(bid) ?? { sum: 0, count: 0 };
      prev.sum += Number(k.occupancy_rate);
      prev.count += 1;
      occSumByBranch.set(bid, prev);
    }
  }

  let lowestOccupancyBranch: WeeklyDigestPayload["lowestOccupancyBranch"] = null;
  for (const [branchId, { sum, count }] of occSumByBranch) {
    if (count === 0) continue;
    const occupancy = Math.round((sum / count) * 10) / 10;
    if (!lowestOccupancyBranch || occupancy < lowestOccupancyBranch.occupancy) {
      lowestOccupancyBranch = { branchName: branchName.get(branchId) ?? "Branch", occupancy };
    }
  }

  const healthScores = await fetchBranchHealthScores(supabase);
  const sortedHealth = [...healthScores].sort((a, b) => b.score - a.score);
  const healthiestBranches = sortedHealth.slice(0, 3).map((h) => ({
    branchName: h.branch_name,
    score: h.score,
    grade: h.grade,
  }));
  const leastHealthyBranches = [...healthScores]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((h) => ({
      branchName: h.branch_name,
      score: h.score,
      grade: h.grade,
    }));

  return {
    weekLabel: currentWeekLabel(),
    submittedThisWeek: submittedThisWeek ?? 0,
    totalOverdue,
    noSubmissionBranches,
    lowestOccupancyBranch,
    healthiestBranches,
    leastHealthyBranches,
    dashboardUrl: `${appBaseUrl()}/dashboard`,
  };
}
