import { NextResponse } from "next/server";

import { createServiceRoleClient } from "@/lib/supabase";
import { requireBranchManagerApi } from "@/lib/branch/require-session";

const DEFAULTS = [
  { slug: "general", name: "General" },
  { slug: "operations", name: "Operations" },
];

export async function GET() {
  const auth = await requireBranchManagerApi();
  if (!auth.ok) return auth.response;

  try {
    const supabase = createServiceRoleClient();
    const bid = auth.session.branch_id;
    const uid = auth.session.id;

    const { data: existing } = await supabase.from("branch_channels").select("id, slug, name").eq("branch_id", bid);

    if (!existing?.length) {
      await supabase.from("branch_channels").insert(DEFAULTS.map((d) => ({ branch_id: bid, slug: d.slug, name: d.name })));
    }

    const { data: channels, error } = await supabase.from("branch_channels").select("id, slug, name").eq("branch_id", bid).order("name");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: reads } = await supabase.from("branch_channel_reads").select("channel_id, last_read_at").eq("user_id", uid);

    const readMap = new Map<string, string>();
    for (const r of reads ?? []) readMap.set(r.channel_id as string, r.last_read_at as string);

    const channelIds = (channels ?? []).map((c) => c.id as string);
    const unreadByChannel = new Map<string, number>();
    if (channelIds.length > 0) {
      const { data: msgs } = await supabase.from("branch_messages").select("id, channel_id, created_at").in("channel_id", channelIds);
      for (const m of msgs ?? []) {
        const cid = m.channel_id as string;
        const last = readMap.get(cid) ?? "1970-01-01T00:00:00.000Z";
        if (new Date(m.created_at as string) > new Date(last)) {
          unreadByChannel.set(cid, (unreadByChannel.get(cid) ?? 0) + 1);
        }
      }
    }

    const list = (channels ?? []).map((c) => ({
      id: c.id as string,
      slug: c.slug as string,
      name: c.name as string,
      unread: unreadByChannel.get(c.id as string) ?? 0,
    }));

    return NextResponse.json({ channels: list });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
