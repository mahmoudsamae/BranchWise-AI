import { NextResponse } from "next/server";

import { createLoginOtpChallenge, verifyOtpChallengeToken } from "@/lib/auth/otp-challenge";
import { maskEmail } from "@/lib/auth/validate-credentials";
import { sendLoginOtpEmail } from "@/lib/email/send-login-otp";
import { createServiceRoleClient } from "@/lib/supabase";

export async function POST(request: Request) {
  let body: { challenge_token?: string };
  try {
    body = (await request.json()) as { challenge_token?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const challengeToken = String(body.challenge_token ?? "").trim();
  if (!challengeToken) {
    return NextResponse.json({ error: "Missing verification session" }, { status: 400 });
  }

  const payload = await verifyOtpChallengeToken(challengeToken);
  if (!payload) {
    return NextResponse.json({ error: "Session expired. Please sign in again." }, { status: 401 });
  }

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: "Server configuration error" }, { status: 503 });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, is_active")
    .eq("id", payload.user_id)
    .maybeSingle();

  if (error || !user?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  if (user.is_active === false) {
    return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
  }

  try {
    const { code, challengeToken: newToken } = await createLoginOtpChallenge(supabase, user.id);
    const result = await sendLoginOtpEmail(user.email, code);

    if (!result.sent) {
      return NextResponse.json(
        { error: result.error, error_code: result.error_code },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      challenge_token: newToken,
      email_masked: maskEmail(user.email),
      message: "A new code was sent to your email.",
      ...(result.devCode ? { dev_code: result.devCode } : {}),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not resend code";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
