import { NextResponse } from "next/server";

import { requireHrApi } from "@/lib/gm-hr/require-session";

export async function PATCH(_request: Request, _ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireHrApi();
  if (!auth.ok) return auth.response;

  return NextResponse.json({ error: "HR can only view staff records" }, { status: 403 });
}
