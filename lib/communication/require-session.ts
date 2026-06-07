import { NextResponse } from "next/server";

import { getSessionUserServer } from "@/lib/session";
import type { AppRole } from "@/types/user";

import { isHubParticipant } from "./channel-access";

export async function requireHubUserApi() {
  const session = await getSessionUserServer();
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isHubParticipant(session.role as AppRole)) {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, session };
}

export async function requireGeneralManagerApi() {
  const session = await getSessionUserServer();
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.role !== "general_manager") {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true as const, session };
}
