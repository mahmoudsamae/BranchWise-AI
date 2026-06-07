import { Resend } from "resend";

export function getResendClient(): { resend: Resend; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || apiKey === "re_xxxxxxxxxxxx") return null;

  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "BranchWise AI <noreply@resend.dev>";
  return { resend: new Resend(apiKey), from };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
