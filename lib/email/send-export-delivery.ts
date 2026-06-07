import { escapeHtml, getResendClient } from "@/lib/email/resend-config";

export async function sendExportDeliveryEmail(opts: {
  to: string;
  exportTypeLabel: string;
  periodLabel: string;
  filename: string;
  pdfBuffer: Buffer;
}): Promise<boolean> {
  const client = getResendClient();
  if (!client) return false;

  const { resend, from } = client;

  await resend.emails.send({
    from,
    to: [opts.to],
    subject: `📊 Scheduled export — ${opts.exportTypeLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#111827">Your scheduled export is ready</h2>
        <p>Your ${escapeHtml(opts.exportTypeLabel)} has been generated automatically.</p>
        <div style="background:#eef2ff;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #6366f1">
          <p style="margin:0"><strong>Period:</strong> ${escapeHtml(opts.periodLabel)}</p>
        </div>
        <p style="color:#6b7280;font-size:14px">The PDF is attached to this email.</p>
      </div>
    `,
    attachments: [
      {
        filename: opts.filename,
        content: opts.pdfBuffer,
      },
    ],
  });

  return true;
}
