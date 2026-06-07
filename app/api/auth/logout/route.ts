import { NextResponse } from "next/server";

import { BW_SESSION_COOKIE } from "@/lib/session";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const res = NextResponse.redirect(new URL("/login", url.origin));
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(BW_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function GET(request: Request) {
  return POST(request);
}
