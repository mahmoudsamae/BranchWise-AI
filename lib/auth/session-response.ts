import { NextResponse } from "next/server";

import { BW_SESSION_COOKIE, signSessionToken } from "@/lib/session";
import type { AppRole } from "@/types/user";

export function redirectForRole(role: AppRole): string {
  switch (role) {
    case "super_admin":
      return "/super-admin";
    case "general_manager":
      return "/dashboard";
    case "hr":
      return "/hr";
    case "branch_manager":
      return "/branch";
    default:
      return "/login";
  }
}

export async function jsonWithSessionCookie(user: {
  id: string;
  email: string;
  role: AppRole;
  branch_id: string | null;
  demo?: boolean;
}) {
  const token = await signSessionToken({
    id: user.id,
    email: user.email,
    role: user.role,
    branch_id: user.branch_id,
    demo: user.demo,
  });

  const redirect = redirectForRole(user.role);
  const res = NextResponse.json({ ok: true, role: user.role, redirect });

  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(BW_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}

/** Email OTP after login is disabled — direct sign-in only. */
export function requiresLoginOtp(_role: AppRole): boolean {
  return false;
}
