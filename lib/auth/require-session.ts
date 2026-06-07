import { NextResponse } from "next/server";

import { getSessionUserServer, type SessionPayload } from "@/lib/session";

export async function requireAnyAuthenticatedApi(): Promise<
  { ok: true; session: SessionPayload } | { ok: false; response: ReturnType<typeof NextResponse.json> }
> {
  const session = await getSessionUserServer();
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { ok: true, session };
}
