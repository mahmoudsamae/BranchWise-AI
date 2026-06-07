import { Resend } from "resend";

export type OtpEmailErrorCode =
  | "resend_not_configured"
  | "resend_invalid_key"
  | "resend_sender_not_verified"
  | "resend_recipient_restricted"
  | "resend_send_failed";

export type SendOtpResult =
  | { sent: true; devCode?: string }
  | { sent: false; error: string; error_code: OtpEmailErrorCode };

type ResendErrorShape = {
  name?: string;
  message?: string;
  statusCode?: number | null;
};

type SendOtpFailure = { sent: false; error: string; error_code: OtpEmailErrorCode };

function maskApiKey(key: string): string {
  if (key.length <= 8) return "[redacted]";
  return `${key.slice(0, 6)}…${key.slice(-2)}`;
}

/** Safe server log — never prints API keys or full recipient lists. */
export function logResendFailure(
  context: string,
  error: ResendErrorShape | null | undefined,
  meta?: { from?: string; statusCode?: number | null },
): void {
  const fromDomain = meta?.from?.includes("@") ? meta.from.split("@").pop() : undefined;
  console.error(`[login-otp] ${context}`, {
    resend_name: error?.name ?? null,
    resend_message: error?.message ?? null,
    resend_status: error?.statusCode ?? meta?.statusCode ?? null,
    from_domain: fromDomain ?? null,
  });
}

function mapResendErrorToClient(error: ResendErrorShape, from: string): Omit<SendOtpFailure, "sent"> {
  const msg = (error.message ?? "").toLowerCase();
  const name = (error.name ?? "").toLowerCase();

  const senderNotVerified =
    msg.includes("not verified") ||
    msg.includes("verify your domain") ||
    msg.includes("domain is not verified") ||
    msg.includes("sender") && msg.includes("verify") ||
    name.includes("validation") && msg.includes("from");

  if (senderNotVerified || from.includes("@resend.dev")) {
    return {
      error_code: "resend_sender_not_verified",
      error:
        "Sign-in email could not be sent: the sender address is not verified in Resend. Your admin must verify the domain used in RESEND_FROM_EMAIL on Vercel (Resend → Domains).",
    };
  }

  const recipientRestricted =
    msg.includes("only send testing emails") ||
    msg.includes("your own email") ||
    msg.includes("verified email") && msg.includes("testing");

  if (recipientRestricted) {
    return {
      error_code: "resend_recipient_restricted",
      error:
        "Sign-in email could not be sent to this address. Until your domain is verified in Resend, codes may only be delivered to addresses allowed by your Resend account.",
    };
  }

  const invalidKey =
    error.statusCode === 401 ||
    error.statusCode === 403 ||
    msg.includes("api key") ||
    msg.includes("unauthorized") ||
    msg.includes("invalid key");

  if (invalidKey) {
    return {
      error_code: "resend_invalid_key",
      error: "Email service is misconfigured (invalid or missing RESEND_API_KEY on the server). Contact your administrator.",
    };
  }

  return {
    error_code: "resend_send_failed",
    error: "Could not send verification email. Try again later or contact your administrator.",
  };
}

export async function sendLoginOtpEmail(to: string, code: string): Promise<SendOtpResult> {
  const isDev = process.env.NODE_ENV !== "production";
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() ?? "BranchWise AI <onboarding@resend.dev>";

  if (!apiKey || apiKey === "re_xxxxxxxxxxxx") {
    if (isDev) {
      console.info(`[login-otp] DEV — no RESEND_API_KEY; code for ${to}: ${code}`);
      return { sent: true, devCode: code };
    }
    console.error("[login-otp] RESEND_API_KEY is missing in production");
    return {
      sent: false,
      error_code: "resend_not_configured",
      error: "Email service is not configured (RESEND_API_KEY missing on server).",
    };
  }

  if (!isDev && from.includes("@resend.dev")) {
    console.error("[login-otp] Production is using a @resend.dev sender — verify a custom domain in Resend", {
      from_hint: from.replace(/<[^>]+>/, "<…@resend.dev>"),
      key_hint: maskApiKey(apiKey),
    });
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject: "BranchWise AI — your sign-in code",
    text: [
      "Your BranchWise sign-in code:",
      "",
      code,
      "",
      "This code expires in 10 minutes.",
      "If you did not try to sign in, ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#111827">BranchWise AI</h2>
        <p>Your sign-in verification code:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#4f46e5">${code}</p>
        <p style="color:#6b7280;font-size:14px">Valid for 10 minutes. If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });

  if (error) {
    logResendFailure("Resend emails.send failed", error, { from, statusCode: error.statusCode });
    const mapped = mapResendErrorToClient(error, from);

    if (isDev) {
      console.warn(`[login-otp] DEV — Resend failed; fallback code for ${to}: ${code}`);
      return { sent: true, devCode: code };
    }

    return { sent: false, ...mapped };
  }

  if (!data?.id) {
    logResendFailure("Resend returned no email id", null, { from });
    if (isDev) {
      return { sent: true, devCode: code };
    }
    return {
      sent: false,
      error_code: "resend_send_failed",
      error: "Could not send verification email. Try again later.",
    };
  }

  return { sent: true };
}
