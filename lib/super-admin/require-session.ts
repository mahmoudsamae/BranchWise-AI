import { NextResponse } from "next/server";

import { getSessionUserServer } from "@/lib/session";

export async function requireSuperAdminApi() {
  const session = await getSessionUserServer();
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.role !== "super_admin") {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, session };
}
