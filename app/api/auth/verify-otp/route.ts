import { NextResponse } from "next/server";

import { verifyLoginOtpCode, verifyOtpChallengeToken } from "@/lib/auth/otp-challenge";
import { jsonWithSessionCookie } from "@/lib/auth/session-response";
import { createServiceRoleClient } from "@/lib/supabase";
import { isAppRole } from "@/types/user";

export async function POST(request: Request) {
  let body: { challenge_token?: string; code?: string };
  try {
    body = (await request.json()) as { challenge_token?: string; code?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const challengeToken = String(body.challenge_token ?? "").trim();
  const code = String(body.code ?? "").trim();

  if (!challengeToken || !code) {
    return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
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

  const verified = await verifyLoginOtpCode(supabase, payload, code);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, role, branch_id, is_active")
    .eq("id", payload.user_id)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 401 });
  }

  if (user.is_active === false) {
    return NextResponse.json({ error: "Account is inactive" }, { status: 403 });
  }

  if (!isAppRole(user.role)) {
    return NextResponse.json({ error: "Invalid user role" }, { status: 403 });
  }

  try {
    return await jsonWithSessionCookie({
      id: user.id,
      email: user.email,
      role: user.role,
      branch_id: user.branch_id,
    });
  } catch {
    return NextResponse.json({ error: "Server configuration error: JWT_SECRET is not set." }, { status: 503 });
  }
}
