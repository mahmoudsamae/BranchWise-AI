import { NextResponse } from "next/server";

import { getSessionUserServer, type SessionPayload } from "@/lib/session";

export type BranchManagerSession = SessionPayload & { branch_id: string };

export async function requireBranchManagerApi(): Promise<
  | { ok: false; response: NextResponse }
  | { ok: true; session: BranchManagerSession }
> {
  const session = await getSessionUserServer();
  if (!session) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.role !== "branch_manager") {
    return { ok: false as const, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const branchId = session.branch_id;
  if (!branchId) {
    return { ok: false as const, response: NextResponse.json({ error: "Branch not assigned" }, { status: 403 }) };
  }
  return { ok: true as const, session: { ...session, branch_id: branchId } };
}
