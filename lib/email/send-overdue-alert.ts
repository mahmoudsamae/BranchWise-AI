import { escapeHtml, getResendClient } from "@/lib/email/resend-config";

export type OverdueReportItem = {
  branchName: string;
  reportTitle: string;
  dueDate: string;
  daysOverdue: number;
  period: string;
};

function managementAlertTable(items: OverdueReportItem[]): string {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827">${escapeHtml(item.branchName)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151">${escapeHtml(item.reportTitle)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151">${escapeHtml(item.period)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#374151">${escapeHtml(item.dueDate)}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:600">${item.daysOverdue}d</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div style="background:#f9fafb;border-radius:8px;padding:8px;margin:16px 0;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px 12px;text-align:left;color:#6b7280">Branch</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280">Report</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280">Period</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280">Due</th>
            <th style="padding:8px 12px;text-align:left;color:#6b7280">Overdue</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export async function sendOverdueAlertEmail(opts: {
  to: string;
  items: OverdueReportItem[];
  dashboardUrl: string;
  audience?: "general_manager" | "super_admin";
}): Promise<"sent" | "skipped"> {
  const client = getResendClient();
  if (!client || opts.items.length === 0) return "skipped";

  const { resend, from } = client;
  const audience = opts.audience ?? "general_manager";
  const isSuperAdmin = audience === "super_admin";
  const subject = isSuperAdmin
    ? `🔴 Escalation: ${opts.items.length} overdue report${opts.items.length === 1 ? "" : "s"} (5+ days)`
    : `⚠️ Overdue reports — ${opts.items.length} pending`;
  const intro = isSuperAdmin
    ? "The following report requests have been overdue for 5 or more days and require attention:"
    : "The following branch report requests are past their due date:";

  await resend.emails.send({
    from,
    to: [opts.to],
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
        <h2 style="color:#111827;margin-bottom:4px">Overdue Report Requests</h2>
        <p style="color:#6b7280;margin-top:0">BranchWise AI</p>
        <p style="color:#374151">${intro}</p>
        ${managementAlertTable(opts.items)}
        <a href="${escapeHtml(opts.dashboardUrl)}" style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">View Dashboard →</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Overdue alert from BranchWise AI.</p>
      </div>
    `,
  });

  return "sent";
}

export async function sendBranchManagerOverdueEmail(opts: {
  to: string;
  item: OverdueReportItem;
  reportUrl: string;
}): Promise<"sent" | "skipped"> {
  const client = getResendClient();
  if (!client) return "skipped";

  const { resend, from } = client;
  const { item } = opts;

  await resend.emails.send({
    from,
    to: [opts.to],
    subject: `Action needed: "${item.reportTitle}" is overdue`,
    html: `
      <div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
        <h2 style="color:#111827;margin-bottom:4px">Your report is overdue</h2>
        <p style="color:#6b7280;margin-top:0">BranchWise AI</p>
        <p style="color:#374151">
          Your report is overdue — please submit it as soon as possible so your branch stays on track.
        </p>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px;color:#111827;font-weight:600">${escapeHtml(item.reportTitle)}</p>
          <p style="margin:0 0 4px;color:#374151;font-size:14px">Period: ${escapeHtml(item.period)}</p>
          <p style="margin:0 0 4px;color:#374151;font-size:14px">Due date: ${escapeHtml(item.dueDate)}</p>
          <p style="margin:0;color:#dc2626;font-size:14px;font-weight:600">${item.daysOverdue} day${item.daysOverdue === 1 ? "" : "s"} overdue</p>
        </div>
        <a href="${escapeHtml(opts.reportUrl)}" style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Fill report now →</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">You received this because a report for your branch is past its due date.</p>
      </div>
    `,
  });

  return "sent";
}
