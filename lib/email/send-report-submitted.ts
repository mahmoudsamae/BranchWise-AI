import { getResendClient } from "@/lib/email/resend-config";

export async function sendReportSubmittedEmail(opts: {
  to: string;
  branchName: string;
  reportTitle: string;
  period: string;
  dashboardUrl: string;
}): Promise<void> {
  const client = getResendClient();
  if (!client) return;

  const { resend, from } = client;

  await resend.emails.send({
    from,
    to: [opts.to],
    subject: `📋 New report submitted — ${opts.branchName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#111827;margin-bottom:4px">New Report Submitted</h2>
        <p style="color:#6b7280;margin-top:0">BranchWise AI</p>
        <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0 0 8px 0"><strong>Branch:</strong> ${opts.branchName}</p>
          <p style="margin:0 0 8px 0"><strong>Report:</strong> ${opts.reportTitle}</p>
          <p style="margin:0"><strong>Period:</strong> ${opts.period}</p>
        </div>
        <a href="${opts.dashboardUrl}" style="display:inline-block;background:#4f46e5;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600">View Report →</a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">You're receiving this because you manage reports in BranchWise AI.</p>
      </div>
    `,
  });
}
