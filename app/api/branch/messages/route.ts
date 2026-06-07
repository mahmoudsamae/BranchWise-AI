import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

export async function GET(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  const channelId = new URL(request.url).searchParams.get("channel_id");
  if (!channelId) return NextResponse.json({ error: "channel_id required" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const bid = auth.session.branch_id;

    const { data: ch, error: cErr } = await supabase.from("branch_channels").select("id, branch_id").eq("id", channelId).maybeSingle();
    if (cErr || !ch || ch.branch_id !== bid) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: msgs, error } = await supabase
      .from("branch_messages")
      .select("id, body, created_at, user_id")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const userIds = [...new Set((msgs ?? []).map((m) => m.user_id as string))];
    const names = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: users } = await supabase.from("users").select("id, full_name, email").in("id", userIds);
      for (const u of users ?? []) {
        names.set(u.id as string, (u.full_name && String(u.full_name).trim()) || String(u.email));
      }
    }

    const messages = (msgs ?? []).map((m) => ({
      id: m.id as string,
      body: m.body as string,
      created_at: m.created_at as string,
      author: names.get(m.user_id as string) ?? "User",
    }));

    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  let body: { channel_id?: string; body?: string };
  try {
    body = (await request.json()) as { channel_id?: string; body?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const channel_id = String(body.channel_id ?? "");
  const text = String(body.body ?? "").trim();
  if (!channel_id || !text) return NextResponse.json({ error: "channel_id and body required" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const bid = auth.session.branch_id;

    const { data: ch, error: cErr } = await supabase.from("branch_channels").select("id, branch_id").eq("id", channel_id).maybeSingle();
    if (cErr || !ch || ch.branch_id !== bid) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { data: msg, error } = await supabase
      .from("branch_messages")
      .insert({ channel_id, user_id: auth.session.id, body: text })
      .select("id, body, created_at")
      .single();

    if (error || !msg) return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 400 });
    return NextResponse.json({ message: msg });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
