import { NextResponse } from "next/server";

import { blockDemoMutation, isDemoSession } from "@/lib/demo/guard";
import { demoChannelMessages } from "@/lib/demo/mock-data";
import { requireHubUserApi } from "@/lib/communication/require-session";
import { enrichMessages, getChannelForUser } from "@/lib/communication/hub-service";
import { createServiceRoleClient } from "@/lib/supabase";
import type { AppRole } from "@/types/user";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  const auth = await requireHubUserApi();
  if (!auth.ok) return auth.response;
  if (isDemoSession(auth.session)) return NextResponse.json(demoChannelMessages());

  const { id: channelId } = await ctx.params;
  const role = auth.session.role as AppRole;
  const before = new URL(request.url).searchParams.get("before");

  try {
    const supabase = createServiceRoleClient();
    const { channel, error: chErr } = await getChannelForUser(supabase, channelId, role);
    if (!channel) {
      return NextResponse.json({ error: chErr ?? "Not found" }, { status: chErr === "Forbidden" ? 403 : 404 });
    }

    let query = supabase
      .from("hub_messages")
      .select("id, body, created_at, user_id")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: rows, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const chronological = [...(rows ?? [])].reverse();
    const messages = await enrichMessages(supabase, chronological);

    return NextResponse.json({
      channel: {
        id: channel.id,
        name: channel.name,
        description: channel.description,
        visible_roles: channel.visible_roles,
      },
      messages,
    });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}

export async function POST(request: Request, ctx: RouteCtx) {
  const auth = await requireHubUserApi();
  if (!auth.ok) return auth.response;
  const blocked = blockDemoMutation(auth.session);
  if (blocked) return blocked;

  const { id: channelId } = await ctx.params;
  const role = auth.session.role as AppRole;

  let body: { content?: string };
  try {
    body = (await request.json()) as { content?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = String(body.content ?? "").trim();
  if (!text) return NextResponse.json({ error: "content is required" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    const { channel, error: chErr } = await getChannelForUser(supabase, channelId, role);
    if (!channel) {
      return NextResponse.json({ error: chErr ?? "Not found" }, { status: chErr === "Forbidden" ? 403 : 404 });
    }

    const { data: inserted, error } = await supabase
      .from("hub_messages")
      .insert({ channel_id: channelId, user_id: auth.session.id, body: text })
      .select("id, body, created_at, user_id")
      .single();

    if (error || !inserted) {
      return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 400 });
    }

    const [message] = await enrichMessages(supabase, [inserted]);
    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
