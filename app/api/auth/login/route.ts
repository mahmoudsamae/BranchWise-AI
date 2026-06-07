import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { z } from "zod";

import { parseBody } from "@/lib/api/validate-body";
import { jsonWithSessionCookie } from "@/lib/auth/session-response";
import { validateUserCredentials } from "@/lib/auth/validate-credentials";
import { createServiceRoleClient } from "@/lib/supabase";

const loginBodySchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

function getLoginRateLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.fixedWindow(5, "15 m"),
    prefix: "auth:login",
  });
}

const loginRateLimiter = getLoginRateLimiter();

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";

  if (loginRateLimiter) {
    const { success } = await loginRateLimiter.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
    }
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseBody(loginBodySchema, raw);
  if (!parsed.ok) return parsed.response;

  const { email, password } = parsed.data;

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return NextResponse.json(
      { error: "Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required for login." },
      { status: 503 },
    );
  }

  const auth = await validateUserCredentials(supabase, email, password);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    return await jsonWithSessionCookie(auth.user);
  } catch {
    return NextResponse.json({ error: "Server configuration error: JWT_SECRET is not set." }, { status: 503 });
  }
}
