import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomInt } from "crypto";

import { getJwtSecretKey } from "@/lib/session";

export const OTP_TTL_SECONDS = 10 * 60;
export const OTP_MAX_ATTEMPTS = 5;

export type OtpChallengePayload = {
  challenge_id: string;
  user_id: string;
};

function generateOtpCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

export async function signOtpChallengeToken(payload: OtpChallengePayload): Promise<string> {
  return new SignJWT({ typ: "login_otp", challenge_id: payload.challenge_id })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.user_id)
    .setIssuedAt()
    .setExpirationTime(`${OTP_TTL_SECONDS}s`)
    .sign(getJwtSecretKey());
}

export async function verifyOtpChallengeToken(token: string): Promise<OtpChallengePayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), { algorithms: ["HS256"] });
    if (payload.typ !== "login_otp") return null;
    const user_id = typeof payload.sub === "string" ? payload.sub : null;
    const challenge_id = typeof payload.challenge_id === "string" ? payload.challenge_id : null;
    if (!user_id || !challenge_id) return null;
    return { user_id, challenge_id };
  } catch {
    return null;
  }
}

export async function createLoginOtpChallenge(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ challengeId: string; code: string; challengeToken: string }> {
  const code = generateOtpCode();
  const code_hash = bcrypt.hashSync(code, 10);
  const expires_at = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  const { data, error } = await supabase
    .from("login_otp_challenges")
    .insert({
      user_id: userId,
      code_hash,
      expires_at,
      max_attempts: OTP_MAX_ATTEMPTS,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "Failed to create OTP challenge");
  }

  const challengeToken = await signOtpChallengeToken({ challenge_id: data.id, user_id: userId });
  return { challengeId: data.id, code, challengeToken };
}

export async function verifyLoginOtpCode(
  supabase: SupabaseClient,
  payload: OtpChallengePayload,
  code: string,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const normalized = code.replace(/\D/g, "").trim();
  if (normalized.length !== 6) {
    return { ok: false, status: 400, error: "Enter the 6-digit code from your email" };
  }

  const { data: row, error } = await supabase
    .from("login_otp_challenges")
    .select("id, user_id, code_hash, expires_at, attempts, max_attempts, consumed_at")
    .eq("id", payload.challenge_id)
    .eq("user_id", payload.user_id)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, status: 401, error: "Verification expired. Please sign in again." };
  }

  if (row.consumed_at) {
    return { ok: false, status: 401, error: "This code was already used. Please sign in again." };
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, status: 401, error: "Code expired. Please sign in again." };
  }

  if ((row.attempts ?? 0) >= (row.max_attempts ?? OTP_MAX_ATTEMPTS)) {
    return { ok: false, status: 429, error: "Too many attempts. Please sign in again." };
  }

  const match = bcrypt.compareSync(normalized, row.code_hash);
  if (!match) {
    await supabase
      .from("login_otp_challenges")
      .update({ attempts: (row.attempts ?? 0) + 1 })
      .eq("id", row.id);
    return { ok: false, status: 401, error: "Invalid code. Check your email and try again." };
  }

  await supabase
    .from("login_otp_challenges")
    .update({ consumed_at: new Date().toISOString(), attempts: (row.attempts ?? 0) + 1 })
    .eq("id", row.id);

  return { ok: true };
}
