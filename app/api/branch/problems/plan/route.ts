import { NextResponse } from "next/server";

import { suggestIssuePlan } from "@/lib/branch/issue-plan-suggest";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

export async function POST(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  let body: { kind?: string; goal?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const kind = body.kind === "project" ? "project" : "problem";
  const goal = body.goal?.trim();
  if (!goal) return NextResponse.json({ error: "goal is required" }, { status: 400 });

  const plan = suggestIssuePlan(kind, goal);
  return NextResponse.json(plan);
}
