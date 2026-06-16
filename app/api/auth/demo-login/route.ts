import { NextResponse } from "next/server";

import { jsonWithSessionCookie } from "@/lib/auth/session-response";
import { demoUserForRole } from "@/lib/demo/config";
import { isAppRole } from "@/types/user";

export async function POST(request: Request) {
  let body: { role?: string };
  try {
    body = (await request.json()) as { role?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const role = body.role;
  if (!role || !isAppRole(role)) {
    return NextResponse.json({ error: "Ungültige Demo-Rolle" }, { status: 400 });
  }

  return jsonWithSessionCookie(demoUserForRole(role));
}
