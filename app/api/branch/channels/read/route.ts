import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

export async function POST(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  let body: { channel_id?: string };
  try {
    body = (await request.json()) as { channel_id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const channel_id = String(body.channel_id ?? "");
  if (!channel_id) return NextResponse.json({ error: "channel_id required" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const bid = auth.session.branch_id;

    const { data: ch, error: cErr } = await supabase.from("branch_channels").select("id, branch_id").eq("id", channel_id).maybeSingle();
    if (cErr || !ch || ch.branch_id !== bid) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const now = new Date().toISOString();
    await supabase.from("branch_channel_reads").upsert(
      { user_id: auth.session.id, channel_id, last_read_at: now },
      { onConflict: "user_id,channel_id" },
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
