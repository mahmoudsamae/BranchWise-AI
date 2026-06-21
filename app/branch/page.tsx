import Link from "next/link";

import { BranchNpsAnalyticsWidget } from "@/components/branch/branch-nps-analytics-widget";
import { BranchBreakfastCard } from "@/components/branch/branch-breakfast-card";
import { BranchGoogleReviewsWidget } from "@/components/branch/branch-google-reviews-widget";
import { BranchOvertimeCard } from "@/components/branch/branch-overtime-card";
import { BranchIssuesSummary } from "@/components/branch/issues/branch-issues-summary";
import { BranchReviewsReplyWidget } from "@/components/branch/branch-reviews-reply-widget";
import { BranchSubmissionHistoryWidget } from "@/components/branch/branch-submission-history-widget";
import { BranchTodaysTasksCard } from "@/components/branch/branch-todays-tasks-card";
import { getBranchBreakfastDashboardSummary, type BranchBreakfastDashboardSummary } from "@/lib/branch/breakfast-dashboard";
import { demoBranchNpsAnalytics, fetchBranchNpsAnalytics, type BranchNpsAnalytics } from "@/lib/branch/fetch-branch-nps";
import { fetchBranchReviewsSummary, fetchBranchSubmissionHistory } from "@/lib/branch/fetch-branch-dashboard";
import { getOvertimeSummary, type OvertimeSummary } from "@/lib/branch/overtime-summary";
import { listIssuesForUser, type BranchIssue } from "@/lib/branch/problems";
import { listReviewsNeedingReply, type ReviewsNeedingReplyPayload } from "@/lib/branch/review-explanations";
import { getTodaysTaskProgress, type TodaysTaskProgress } from "@/lib/branch/todays-tasks";
import { demoBranchDashboard } from "@/lib/demo/mock-data";
import { isDemoSession } from "@/lib/demo/guard";
import type { BranchReviewsSummary } from "@/lib/branch/branch-reviews-summary";
import type { SubmissionHistoryPoint } from "@/lib/branch/submission-history";
import { createServiceRoleClient } from "@/lib/supabase";
import { getSessionUserServer } from "@/lib/session";

const EMPTY_BREAKFAST: BranchBreakfastDashboardSummary = {
  linked: false,
  tomorrowYmd: "",
  tomorrowLabel: "",
  itemCount: 0,
  orderCount: 0,
  highVolume: false,
  hint: null,
};

const EMPTY_OVERTIME: OvertimeSummary = {
  monthHours: 0,
  allTimeHours: 0,
  staffWithOvertimeMonth: 0,
  nearLimitCount: 0,
  nearLimitNames: [],
  lastUpdated: null,
  monthLabel: new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date()),
  period: { from: "", to: "" },
};

const EMPTY_REVIEWS_NEEDING_REPLY: ReviewsNeedingReplyPayload = {
  linked: false,
  overallRating: 0,
  userRatingCount: 0,
  googleMapsUrl: null,
  reviews: [],
};

export default async function BranchDashboardPage() {
  const session = await getSessionUserServer();
  const bid = session?.branch_id;
  let displayName = session?.email ?? "there";
  let pendingCount = 0;
  let submittedWeek = 0;
  let overdueCount = 0;
  let submissionHistory: SubmissionHistoryPoint[] = [];
  let reviewsSummary: BranchReviewsSummary = { linked: false };
  let todaysTasks: TodaysTaskProgress[] = [];
  let overtime: OvertimeSummary = EMPTY_OVERTIME;
  let issues: BranchIssue[] = [];
  let reviewsNeedingReply: ReviewsNeedingReplyPayload = EMPTY_REVIEWS_NEEDING_REPLY;
  let breakfast: BranchBreakfastDashboardSummary = EMPTY_BREAKFAST;
  let npsAnalytics: BranchNpsAnalytics = demoBranchNpsAnalytics();
  let loadError: string | null = null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const weekAgoStr = weekAgo.toISOString();

  if (isDemoSession(session)) {
    const demo = demoBranchDashboard();
    displayName = demo.displayName;
    pendingCount = demo.pendingCount;
    submittedWeek = demo.submittedWeek;
    overdueCount = demo.overdueCount;
    submissionHistory = demo.submissionHistory;
    reviewsSummary = demo.reviewsSummary;
    todaysTasks = demo.todaysTasks;
    overtime = demo.overtime;
    issues = demo.issues;
    reviewsNeedingReply = demo.reviewsNeedingReply;
    breakfast = demo.breakfast;
    npsAnalytics = demoBranchNpsAnalytics();
    loadError = demo.loadError;
  } else if (!bid) {
    loadError = "No branch assigned to your account.";
  } else {
    try {
      const supabase = createServiceRoleClient();
      const { data: user } = await supabase.from("users").select("full_name, email").eq("id", session!.id).maybeSingle();
      displayName = (user?.full_name && user.full_name.trim()) || user?.email || displayName;

      const { data: pendingReqs, error: pErr } = await supabase
        .from("report_requests")
        .select("id, due_date")
        .eq("branch_id", bid)
        .eq("status", "pending");

      if (pErr) loadError = pErr.message;
      else {
        pendingCount = (pendingReqs ?? []).length;
        overdueCount = (pendingReqs ?? []).filter((r) => r.due_date < todayStr).length;
      }

      const { count: sw } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("branch_id", bid)
        .eq("status", "submitted")
        .gte("submitted_at", weekAgoStr);
      submittedWeek = sw ?? 0;

      [submissionHistory, reviewsSummary, todaysTasks, overtime, issues, reviewsNeedingReply, breakfast, npsAnalytics] =
        await Promise.all([
        fetchBranchSubmissionHistory(),
        fetchBranchReviewsSummary(),
        getTodaysTaskProgress(bid),
        getOvertimeSummary(bid),
        listIssuesForUser(bid, session!.id),
        listReviewsNeedingReply(bid),
        getBranchBreakfastDashboardSummary(bid),
        fetchBranchNpsAnalytics(bid),
      ]);
    } catch {
      loadError = "Daten konnten nicht geladen werden (Datenbank oder Service-Schlüssel).";
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";
  const dateLine = new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold text-[#f9fafb] sm:text-3xl">
            {greeting}, {displayName}
          </h1>
          <p className="mt-1 text-sm text-[#9ca3af]">{dateLine}</p>
        </div>
      </div>

      {loadError ? <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{loadError}</div> : null}

      {overdueCount > 0 ? (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-100">
          Du hast {overdueCount} überfällige{overdueCount === 1 ? "n" : ""} Bericht{overdueCount === 1 ? "" : "e"}. Bitte jetzt einreichen.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 transition hover:border-red-500/30">
          <p className="text-sm font-medium text-[#9ca3af]">Berichte</p>
          <p className="mt-2 text-3xl font-bold text-red-400">
            {overdueCount} <span className="text-sm font-normal text-[#9ca3af]">überfällig</span>
          </p>
          <p className="mt-1 text-sm text-[#9ca3af]">
            {pendingCount} ausstehend · {submittedWeek} diese Woche eingereicht
          </p>
          <Link href="/branch/reports" className="mt-4 inline-flex text-sm font-medium text-[#a5b4fc] hover:text-[#c7d2fe]">
            Meine Berichte öffnen →
          </Link>
        </div>

        <BranchTodaysTasksCard tasks={todaysTasks} />
        <BranchOvertimeCard overtime={overtime} />
        <BranchBreakfastCard breakfast={breakfast} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <BranchIssuesSummary issues={issues} />
        </div>
        <BranchReviewsReplyWidget payload={reviewsNeedingReply} />
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[#f9fafb]">Weitere Einblicke</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <BranchNpsAnalyticsWidget nps={npsAnalytics} />
          <BranchSubmissionHistoryWidget history={submissionHistory} />
          <BranchGoogleReviewsWidget reviews={reviewsSummary} />
        </div>
      </section>
    </div>
  );
}
