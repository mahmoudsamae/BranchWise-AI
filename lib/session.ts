import { SignJWT, jwtVerify } from "jose";

import type { AppRole } from "@/types/user";
import { isAppRole } from "@/types/user";

export const BW_SESSION_COOKIE = "bw_session";

export type SessionPayload = {
  id: string;
  email: string;
  role: AppRole;
  branch_id: string | null;
  demo?: boolean;
};

export function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET ?? process.env.BW_JWT_SECRET;
  if (!secret) {
    throw new Error("Set JWT_SECRET or BW_JWT_SECRET in your environment (e.g. .env.local).");
  }
  return new TextEncoder().encode(secret);
}

/** Create signed JWT for httpOnly cookie (call from Route Handlers / Server Actions only). */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({
    email: payload.email,
    role: payload.role,
    branch_id: payload.branch_id,
    ...(payload.demo ? { demo: true } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.id)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecretKey());

  return token;
}

/** Verify JWT string (Edge-safe — no `next/headers`). */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), { algorithms: ["HS256"] });
    const id = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const role = typeof payload.role === "string" ? payload.role : null;
    const branchRaw = payload.branch_id;
    const branch_id =
      branchRaw === null || branchRaw === undefined ? null : typeof branchRaw === "string" ? branchRaw : String(branchRaw);

    if (!id || !email || !role) return null;
    if (!isAppRole(role)) return null;
    const demo = payload.demo === true;

    return { id, email, role, branch_id, ...(demo ? { demo: true } : {}) };
  } catch {
    return null;
  }
}

/** Server Components / Server Actions — decode JWT from `bw_session` cookie. */
export async function getSessionUser(): Promise<SessionPayload | null> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const raw = cookieStore.get(BW_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return verifySessionToken(raw);
}

/** Alias for server modules (same as {@link getSessionUser}). */
export const getSessionUserServer = getSessionUser;
