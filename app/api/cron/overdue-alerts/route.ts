import { NextResponse } from "next/server";

import { verifyCronRequest } from "@/lib/cron/verify-cron";
import {
  daysOverdueFromDueDate,
  logKey,
  recipientRolesForDaysOverdue,
  shouldSkipSuperAdminAlert,
  type OverdueRecipientRole,
} from "@/lib/cron/overdue-alert-escalation";
import { appBaseUrl } from "@/lib/email/app-url";
import {
  sendBranchManagerOverdueEmail,
  sendOverdueAlertEmail,
  type OverdueReportItem,
} from "@/lib/email/send-overdue-alert";
import { formatPeriodLabel } from "@/lib/staff/period";
import { createServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type OverdueRequestRow = {
  id: string;
  title: string;
  branch_id: string;
  period_start: string;
  period_end: string;
  due_date: string;
};

type AlertWorkItem = {
  requestId: string;
  role: OverdueRecipientRole;
  daysOverdue: number;
  item: OverdueReportItem;
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowDate(today: string): string {
  const d = new Date(`${today}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function formatDueDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00.000Z`));
  } catch {
    return iso;
  }
}

function buildItem(
  row: OverdueRequestRow,
  branchName: string,
  daysOverdue: number,
): OverdueReportItem {
  return {
    branchName,
    reportTitle: String(row.title ?? "Report"),
    dueDate: formatDueDate(String(row.due_date)),
    daysOverdue,
    period: formatPeriodLabel(String(row.period_start), String(row.period_end)),
  };
}

export async function GET(request: Request) {
  const authError = verifyCronRequest(request);
  if (authError) return authError;

  try {
    const supabase = createServiceRoleClient();
    const today = todayDate();
    const tomorrow = tomorrowDate(today);
    const baseUrl = appBaseUrl();

    const { data: overdueReqs, error: reqErr } = await supabase
      .from("report_requests")
      .select("id, title, branch_id, period_start, period_end, due_date")
      .eq("status", "pending")
      .lt("due_date", today);

    if (reqErr) {
      return NextResponse.json({ error: reqErr.message }, { status: 500 });
    }

    const overdue = (overdueReqs ?? []) as OverdueRequestRow[];
    let processed = 0;
    let skipped = 0;

    if (overdue.length === 0) {
      return NextResponse.json({ processed: 0, sent: 0, skipped: 0, overdue: 0 });
    }

    const requestIds = overdue.map((r) => r.id);
    const branchIds = [...new Set(overdue.map((r) => r.branch_id))];

    const [{ data: branches }, { data: logsToday }, { data: superAdminLogs }] = await Promise.all([
      supabase.from("branches").select("id, name").in("id", branchIds),
      supabase
        .from("overdue_alert_log")
        .select("report_request_id, recipient_role")
        .gte("sent_at", `${today}T00:00:00.000Z`)
        .lt("sent_at", `${tomorrow}T00:00:00.000Z`)
        .in("report_request_id", requestIds),
      supabase
        .from("overdue_alert_log")
        .select("report_request_id, sent_at")
        .eq("recipient_role", "super_admin")
        .in("report_request_id", requestIds)
        .order("sent_at", { ascending: false }),
    ]);

    const branchName = new Map((branches ?? []).map((b) => [b.id as string, String(b.name)]));
    const sentToday = new Set((logsToday ?? []).map((l) => logKey(l.report_request_id as string, l.recipient_role as OverdueRecipientRole)));

    const lastSuperAdminSent = new Map<string, string>();
    for (const log of superAdminLogs ?? []) {
      const rid = log.report_request_id as string;
      if (!lastSuperAdminSent.has(rid)) {
        lastSuperAdminSent.set(rid, log.sent_at as string);
      }
    }

    const work: AlertWorkItem[] = [];

    for (const row of overdue) {
      processed += 1;
      const dueDate = String(row.due_date);
      const daysOverdue = daysOverdueFromDueDate(dueDate, today);
      const roles = recipientRolesForDaysOverdue(daysOverdue);
      if (roles.length === 0) {
        skipped += 1;
        continue;
      }

      const item = buildItem(row, branchName.get(row.branch_id) ?? "Branch", daysOverdue);

      for (const role of roles) {
        const key = logKey(row.id, role);

        if (role === "super_admin") {
          if (sentToday.has(key) || shouldSkipSuperAdminAlert(lastSuperAdminSent.get(row.id) ?? null, today)) {
            skipped += 1;
            continue;
          }
        } else if (sentToday.has(key)) {
          skipped += 1;
          continue;
        }

        work.push({ requestId: row.id, role, daysOverdue, item });
      }
    }

    if (work.length === 0) {
      return NextResponse.json({ processed, sent: 0, skipped, overdue: overdue.length });
    }

    const branchIdsForBm = [
      ...new Set(work.filter((w) => w.role === "branch_manager").map((w) => overdue.find((r) => r.id === w.requestId)!.branch_id)),
    ];

    const [{ data: gms }, { data: superAdmins }, { data: branchManagers }] = await Promise.all([
      supabase.from("users").select("email").eq("role", "general_manager").eq("is_active", true),
      supabase.from("users").select("email").eq("role", "super_admin").eq("is_active", true),
      branchIdsForBm.length
        ? supabase
            .from("users")
            .select("email, branch_id")
            .eq("role", "branch_manager")
            .eq("is_active", true)
            .in("branch_id", branchIdsForBm)
        : Promise.resolve({ data: [] }),
    ]);

    const gmEmails = [...new Set((gms ?? []).map((u) => String(u.email).trim()).filter(Boolean))];
    const superAdminEmails = [...new Set((superAdmins ?? []).map((u) => String(u.email).trim()).filter(Boolean))];
    const bmByBranch = new Map<string, string[]>();
    for (const u of branchManagers ?? []) {
      const bid = u.branch_id as string;
      const email = String(u.email).trim();
      if (!bid || !email) continue;
      const list = bmByBranch.get(bid) ?? [];
      list.push(email);
      bmByBranch.set(bid, list);
    }

    let sent = 0;
    const logsToInsert: { report_request_id: string; recipient_role: OverdueRecipientRole; days_overdue: number }[] = [];

    const gmItems = work.filter((w) => w.role === "general_manager");
    if (gmItems.length > 0 && gmEmails.length > 0) {
      const items = gmItems.map((w) => w.item);
      const results = await Promise.allSettled(
        gmEmails.map((to) =>
          sendOverdueAlertEmail({
            to,
            items,
            dashboardUrl: `${baseUrl}/dashboard/reports`,
            audience: "general_manager",
          }),
        ),
      );
      const anySent = results.some((r) => r.status === "fulfilled" && r.value === "sent");
      if (anySent) {
        for (const w of gmItems) {
          logsToInsert.push({
            report_request_id: w.requestId,
            recipient_role: "general_manager",
            days_overdue: w.daysOverdue,
          });
        }
      } else {
        skipped += gmItems.length;
      }
    } else if (gmItems.length > 0) {
      skipped += gmItems.length;
    }

    const superItems = work.filter((w) => w.role === "super_admin");
    if (superItems.length > 0 && superAdminEmails.length > 0) {
      const items = superItems.map((w) => w.item);
      const results = await Promise.allSettled(
        superAdminEmails.map((to) =>
          sendOverdueAlertEmail({
            to,
            items,
            dashboardUrl: `${baseUrl}/super-admin`,
            audience: "super_admin",
          }),
        ),
      );
      const anySent = results.some((r) => r.status === "fulfilled" && r.value === "sent");
      if (anySent) {
        for (const w of superItems) {
          logsToInsert.push({
            report_request_id: w.requestId,
            recipient_role: "super_admin",
            days_overdue: w.daysOverdue,
          });
        }
      } else {
        skipped += superItems.length;
      }
    } else if (superItems.length > 0) {
      skipped += superItems.length;
    }

    for (const w of work.filter((x) => x.role === "branch_manager")) {
      const row = overdue.find((r) => r.id === w.requestId);
      if (!row) continue;
      const emails = [...new Set(bmByBranch.get(row.branch_id) ?? [])];
      if (emails.length === 0) {
        skipped += 1;
        continue;
      }

      const reportUrl = `${baseUrl}/branch/reports/${w.requestId}`;
      const results = await Promise.allSettled(
        emails.map((to) => sendBranchManagerOverdueEmail({ to, item: w.item, reportUrl })),
      );
      const anySent = results.some((r) => r.status === "fulfilled" && r.value === "sent");
      if (anySent) {
        logsToInsert.push({
          report_request_id: w.requestId,
          recipient_role: "branch_manager",
          days_overdue: w.daysOverdue,
        });
      } else {
        skipped += 1;
      }
    }

    if (logsToInsert.length > 0) {
      const { error: logErr } = await supabase.from("overdue_alert_log").insert(logsToInsert);
      if (logErr && logErr.code !== "42P01" && logErr.code !== "23505") {
        console.error("[overdue-alerts] log insert failed:", logErr.message);
      } else if (!logErr || logErr.code === "23505") {
        sent = logsToInsert.length;
      }
    }

    return NextResponse.json({ processed, sent, skipped, overdue: overdue.length });
  } catch (e) {
    console.error("[GET /api/cron/overdue-alerts]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
