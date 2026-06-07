import { escapeHtml, getResendClient } from "@/lib/email/resend-config";

export type WeeklyDigestPayload = {
  weekLabel: string;
  submittedThisWeek: number;
  totalOverdue: number;
  noSubmissionBranches: string[];
  topRevenueBranch: { branchName: string; revenue: number } | null;
  lowestOccupancyBranch: { branchName: string; occupancy: number } | null;
  healthiestBranches: { branchName: string; score: number; grade: string }[];
  leastHealthyBranches: { branchName: string; score: number; grade: string }[];
  dashboardUrl: string;
};

export async function sendWeeklyDigestEmail(opts: {
  to: string;
  digest: WeeklyDigestPayload;
}): Promise<"sent" | "skipped"> {
  const client = getResendClient();
  if (!client) return "skipped";

  const { resend, from } = client;
  const { digest } = opts;

  const noSubmissionHtml =
    digest.noSubmissionBranches.length > 0
      ? `
        <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px 0;font-weight:600;color:#92400e">Branches with no submission this week</p>
          <ul style="margin:0;padding-left:20px;color:#78350f">
            ${digest.noSubmissionBranches.map((name) => `<li>${escapeHtml(name)}</li>`).join("")}
          </ul>
        </div>
      `
      : `<p style="color:#059669;margin:16px 0">All branches submitted at least one report this week.</p>`;

  const topRevenue = digest.topRevenueBranch
    ? `<p style="margin:0"><strong>Top revenue:</strong> ${escapeHtml(digest.topRevenueBranch.branchName)} (€${digest.topRevenueBranch.revenue.toLocaleString("en-GB")})</p>`
    : `<p style="margin:0;color:#6b7280"><strong>Top revenue:</strong> No KPI data this week</p>`;

  const lowestOcc = digest.lowestOccupancyBranch
    ? `<p style="margin:8px 0 0 0"><strong>Lowest occupancy:</strong> ${escapeHtml(digest.lowestOccupancyBranch.branchName)} (${digest.lowestOccupancyBranch.occupancy}%)</p>`
    : `<p style="margin:8px 0 0 0;color:#6b7280"><strong>Lowest occupancy:</strong> No occupancy data this week</p>`;

  const healthList = (items: WeeklyDigestPayload["healthiestBranches"], title: string, accent: string) =>
    items.length > 0
      ? `
        <p style="margin:0 0 8px 0;font-weight:600;color:${accent}">${title}</p>
        <ul style="margin:0 0 16px 0;padding-left:20px;color:#374151">
          ${items.map((b) => `<li>${escapeHtml(b.branchName)} — ${b.score} (${b.grade})</li>`).join("")}
        </ul>
      `
      : "";

  const healthHtml =
    digest.healthiestBranches.length > 0 || digest.leastHealthyBranches.length > 0
      ? `
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 12px 0;font-weight:600;color:#111827">Branch health scores</p>
          ${healthList(digest.healthiestBranches, "Top performers", "#059669")}
          ${healthList(digest.leastHealthyBranches, "Needs attention", "#dc2626")}
        </div>
      `
      : "";

  await resend.emails.send({
    from,
    to: [opts.to],
    subject: `📊 Weekly digest — ${digest.weekLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#111827;margin-bottom:4px">Weekly Operations Digest</h2>
        <p style="color:#6b7280;margin-top:0">${escapeHtml(digest.weekLabel)} · BranchWise AI</p>

        <div style="display:grid;gap:12px;margin:20px 0">
          <div style="background:#f9fafb;border-radius:8px;padding:16px">
            <p style="margin:0 0 4px 0;color:#6b7280;font-size:13px">Reports submitted</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:#111827">${digest.submittedThisWeek}</p>
          </div>
          <div style="background:#fef2f2;border-radius:8px;padding:16px">
            <p style="margin:0 0 4px 0;color:#991b1b;font-size:13px">Overdue requests</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:#dc2626">${digest.totalOverdue}</p>
          </div>
        </div>

        ${noSubmissionHtml}

        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px 0;font-weight:600;color:#111827">KPI highlights</p>
          ${topRevenue}
          ${lowestOcc}
        </div>

        ${healthHtml}

        <a href="${escapeHtml(digest.dashboardUrl)}" style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">Open Dashboard →</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Weekly summary for general managers · BranchWise AI</p>
      </div>
    `,
  });

  return "sent";
}
