import { escapeHtml, getResendClient } from "@/lib/email/resend-config";

export async function sendReportReviewedEmail(opts: {
  to: string;
  branchName: string;
  reportTitle: string;
  period: string;
  reportsUrl: string;
}): Promise<void> {
  const client = getResendClient();
  if (!client) return;

  const { resend, from } = client;

  await resend.emails.send({
    from,
    to: [opts.to],
    subject: `✅ Report reviewed — ${opts.branchName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#111827">Report Reviewed</h2>
        <p>Your report has been reviewed and accepted.</p>
        <div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #22c55e">
          <p style="margin:0 0 8px 0"><strong>Branch:</strong> ${escapeHtml(opts.branchName)}</p>
          <p style="margin:0 0 8px 0"><strong>Report:</strong> ${escapeHtml(opts.reportTitle)}</p>
          <p style="margin:0"><strong>Period:</strong> ${escapeHtml(opts.period)}</p>
        </div>
        <a href="${escapeHtml(opts.reportsUrl)}" style="display:inline-block;background:#22c55e;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">View Reports →</a>
      </div>
    `,
  });
}
