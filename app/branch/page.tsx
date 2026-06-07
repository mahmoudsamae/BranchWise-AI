import Link from "next/link";

import { BranchGoogleReviewsWidget } from "@/components/branch/branch-google-reviews-widget";
import { BranchSubmissionHistoryWidget } from "@/components/branch/branch-submission-history-widget";
import { Badge } from "@/components/ui/Badge";
import { Table, TableBody, TableCell, TableHead, TableRow } from "@/components/ui/Table";
import { fetchBranchReviewsSummary, fetchBranchSubmissionHistory } from "@/lib/branch/fetch-branch-dashboard";
import type { BranchReviewsSummary } from "@/lib/branch/branch-reviews-summary";
import type { SubmissionHistoryPoint } from "@/lib/branch/submission-history";
import { createServiceRoleClient } from "@/lib/supabase";
import { getSessionUserServer } from "@/lib/session";
import { daysUntilDue, urgencyForDueDate } from "@/lib/branch/urgency";

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatDay(d: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(`${d}T00:00:00.000Z`));
  } catch {
    return d;
  }
}

export default async function BranchDashboardPage() {
  const session = await getSessionUserServer();
  const bid = session?.branch_id;
  let displayName = session?.email ?? "there";
  let pendingCount = 0;
  let submittedWeek = 0;
  let overdueCount = 0;
  let pendingRows: {
    id: string;
    title: string;
    request_type: string;
    period_start: string;
    period_end: string;
    due_date: string;
  }[] = [];
  let recent: { id: string; title: string; period_start: string; period_end: string; submitted_at: string; status: string }[] = [];
  let submissionHistory: SubmissionHistoryPoint[] = [];
  let reviewsSummary: BranchReviewsSummary = { linked: false };
  let loadError: string | null = null;

  const todayStr = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date();
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  const weekAgoStr = weekAgo.toISOString();

  if (!bid) {
    loadError = "No branch assigned to your account.";
  } else {
    try {
      const supabase = createServiceRoleClient();
      const { data: user } = await supabase.from("users").select("full_name, email").eq("id", session!.id).maybeSingle();
      displayName = (user?.full_name && user.full_name.trim()) || user?.email || displayName;

      const { data: pendingReqs, error: pErr } = await supabase
        .from("report_requests")
        .select("id, title, request_type, period_start, period_end, due_date")
        .eq("branch_id", bid)
        .eq("status", "pending")
        .order("due_date", { ascending: true });

      if (pErr) loadError = pErr.message;
      else {
        pendingRows = (pendingReqs ?? []) as typeof pendingRows;
        pendingCount = pendingRows.length;
        overdueCount = pendingRows.filter((r) => r.due_date < todayStr).length;
      }

      const { count: sw } = await supabase
        .from("reports")
        .select("*", { count: "exact", head: true })
        .eq("branch_id", bid)
        .eq("status", "submitted")
        .gte("submitted_at", weekAgoStr);
      submittedWeek = sw ?? 0;

      const { data: recentReps } = await supabase
        .from("reports")
        .select("id, submitted_at, status, request_id")
        .eq("branch_id", bid)
        .eq("status", "submitted")
        .not("submitted_at", "is", null)
        .order("submitted_at", { ascending: false })
        .limit(5);

      const rids = [...new Set((recentReps ?? []).map((r) => r.request_id as string))];
      const titles = new Map<string, { title: string; period_start: string; period_end: string }>();
      if (rids.length) {
        const { data: reqs } = await supabase.from("report_requests").select("id, title, period_start, period_end").in("id", rids);
        for (const q of reqs ?? []) titles.set(q.id as string, { title: String(q.title), period_start: String(q.period_start), period_end: String(q.period_end) });
      }
      recent = (recentReps ?? []).map((r) => {
        const t = titles.get(r.request_id as string);
        return {
          id: r.id as string,
          title: t?.title ?? "—",
          period_start: t?.period_start ?? "",
          period_end: t?.period_end ?? "",
          submitted_at: r.submitted_at as string,
          status: r.status as string,
        };
      });

      [submissionHistory, reviewsSummary] = await Promise.all([
        fetchBranchSubmissionHistory(),
        fetchBranchReviewsSummary(),
      ]);
    } catch {
      loadError = "Could not load data (database or service key).";
    }
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const dateLine = new Intl.DateTimeFormat("en-GB", {
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
          You have {overdueCount} overdue report{overdueCount === 1 ? "" : "s"}. Submit them now.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 transition hover:border-amber-500/30">
          <p className="text-sm font-medium text-[#9ca3af]">Pending Requests</p>
          <p className="mt-2 text-3xl font-bold text-amber-400">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 transition hover:border-emerald-500/30">
          <p className="text-sm font-medium text-[#9ca3af]">Submitted This Week</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">{submittedWeek}</p>
        </div>
        <div className="rounded-2xl border border-[#1f2937] bg-[#111827] p-6 transition hover:border-red-500/30">
          <p className="text-sm font-medium text-[#9ca3af]">Overdue</p>
          <p className="mt-2 text-3xl font-bold text-red-400">{overdueCount}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BranchSubmissionHistoryWidget history={submissionHistory} />
        <BranchGoogleReviewsWidget reviews={reviewsSummary} />
      </div>

      <section>
        <h2 className="text-xl font-semibold text-[#f9fafb]">Pending report requests</h2>
        <p className="mt-1 text-sm text-[#9ca3af]">Open assignments for your branch.</p>
        <div className="mt-4">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell as="th">Title</TableCell>
                <TableCell as="th">Type</TableCell>
                <TableCell as="th">Period</TableCell>
                <TableCell as="th">Due Date</TableCell>
                <TableCell as="th">Urgency</TableCell>
                <TableCell as="th">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pendingRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-[#9ca3af]">
                    No pending requests.
                  </TableCell>
                </TableRow>
              ) : (
                pendingRows.map((r) => {
                  const u = urgencyForDueDate(r.due_date);
                  const days = daysUntilDue(r.due_date);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium text-[#f9fafb]">{r.title}</TableCell>
                      <TableCell className="text-[#9ca3af]">{r.request_type}</TableCell>
                      <TableCell className="text-[#9ca3af]">
                        {formatDay(r.period_start)} → {formatDay(r.period_end)}
                      </TableCell>
                      <TableCell className="text-[#9ca3af]">{formatDay(r.due_date)}</TableCell>
                      <TableCell>
                        {u === "overdue" ? (
                          <Badge tone="branch_manager" className="!border-red-500/40 !bg-red-500/15 !text-red-200">
                            Overdue
                          </Badge>
                        ) : u === "today" ? (
                          <Badge tone="hr" className="!border-amber-500/40 !bg-amber-500/15 !text-amber-200">
                            Due today
                          </Badge>
                        ) : (
                          <span className="rounded-full border border-[#374151] bg-[#111827] px-2 py-0.5 text-xs text-[#9ca3af]">
                            Due in {days} day{days === 1 ? "" : "s"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/branch/reports/${r.id}`}
                          className="inline-flex items-center justify-center rounded-lg bg-[#6366f1] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#4f46e5]"
                        >
                          Fill Report
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold text-[#f9fafb]">Recent submissions</h2>
        <p className="mt-1 text-sm text-[#9ca3af]">Last 5 submitted reports.</p>
        <div className="mt-4">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell as="th">Title</TableCell>
                <TableCell as="th">Period</TableCell>
                <TableCell as="th">Submitted At</TableCell>
                <TableCell as="th">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-[#9ca3af]">
                    No submissions yet.
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-[#f9fafb]">
                      <Link href="/branch/reports" className="hover:text-white underline underline-offset-2">
                        {r.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-[#9ca3af]">
                      {formatDay(r.period_start)} → {formatDay(r.period_end)}
                    </TableCell>
                    <TableCell className="text-[#9ca3af]">{formatDate(r.submitted_at)}</TableCell>
                    <TableCell className="text-emerald-400">Submitted</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
