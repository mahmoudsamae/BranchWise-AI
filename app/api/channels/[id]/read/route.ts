import { NextResponse } from "next/server";

import { requireHubUserApi } from "@/lib/communication/require-session";
import { getChannelForUser } from "@/lib/communication/hub-service";
import { createServiceRoleClient } from "@/lib/supabase";
import type { AppRole } from "@/types/user";

type RouteCtx = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: RouteCtx) {
  const auth = await requireHubUserApi();
  if (!auth.ok) return auth.response;

  const { id: channelId } = await ctx.params;
  const role = auth.session.role as AppRole;

  try {
    const supabase = createServiceRoleClient();
    const { channel, error: chErr } = await getChannelForUser(supabase, channelId, role);
    if (!channel) {
      return NextResponse.json({ error: chErr ?? "Not found" }, { status: chErr === "Forbidden" ? 403 : 404 });
    }

    const { error } = await supabase.from("hub_channel_reads").upsert(
      {
        user_id: auth.session.id,
        channel_id: channelId,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "user_id,channel_id" },
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
