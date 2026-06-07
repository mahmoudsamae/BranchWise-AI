import type { SupabaseClient } from "@supabase/supabase-js";

export type SubmissionHistoryStatus = "submitted" | "overdue" | "pending";

export type SubmissionHistoryPoint = {
  week: string;
  status: SubmissionHistoryStatus;
  submitted_at: string | null;
};

export function weekLabelFromPeriodStart(periodStart: string): string {
  try {
    const d = new Date(`${periodStart}T00:00:00.000Z`);
    const month = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(d);
    const day = d.getUTCDate();
    const weekOfMonth = Math.min(4, Math.ceil(day / 7));
    return `${month} W${weekOfMonth}`;
  } catch {
    return periodStart;
  }
}

function isoDateOnly(iso: string): string {
  return iso.slice(0, 10);
}

function deriveStatus(
  requestStatus: string,
  dueDate: string,
  submittedAt: string | null,
  today: string,
): SubmissionHistoryStatus {
  if (requestStatus === "submitted" && submittedAt) {
    return isoDateOnly(submittedAt) <= dueDate ? "submitted" : "overdue";
  }
  if (dueDate < today) return "overdue";
  return "pending";
}

export async function getBranchSubmissionHistory(
  supabase: SupabaseClient,
  branchId: string,
): Promise<SubmissionHistoryPoint[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: requests, error } = await supabase
    .from("report_requests")
    .select("id, period_start, due_date, status")
    .eq("branch_id", branchId)
    .order("period_start", { ascending: false })
    .limit(8);

  if (error) throw new Error(error.message);

  const rows = requests ?? [];
  if (rows.length === 0) return [];

  const requestIds = rows.map((r) => r.id as string);
  const { data: reports } = await supabase
    .from("reports")
    .select("request_id, submitted_at, status")
    .in("request_id", requestIds)
    .eq("status", "submitted")
    .not("submitted_at", "is", null);

  const submittedAtByRequest = new Map<string, string>();
  for (const rep of reports ?? []) {
    const rid = rep.request_id as string;
    const at = rep.submitted_at as string;
    if (!submittedAtByRequest.has(rid)) submittedAtByRequest.set(rid, at);
  }

  const points = rows.map((r) => {
    const periodStart = String(r.period_start);
    const dueDate = String(r.due_date);
    const requestStatus = String(r.status);
    const submittedAt = submittedAtByRequest.get(r.id as string) ?? null;

    return {
      week: weekLabelFromPeriodStart(periodStart),
      status: deriveStatus(requestStatus, dueDate, submittedAt, today),
      submitted_at: submittedAt,
    };
  });

  return points.reverse();
}
