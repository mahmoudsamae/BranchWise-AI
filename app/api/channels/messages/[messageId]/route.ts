import { NextResponse } from "next/server";

import { requireHubUserApi } from "@/lib/communication/require-session";
import { enrichMessages, getChannelForUser } from "@/lib/communication/hub-service";
import { createServiceRoleClient } from "@/lib/supabase";
import type { AppRole } from "@/types/user";

type RouteCtx = { params: Promise<{ messageId: string }> };

/** Fetch a single message (used after Realtime INSERT). */
export async function GET(_request: Request, ctx: RouteCtx) {
  const auth = await requireHubUserApi();
  if (!auth.ok) return auth.response;

  const { messageId } = await ctx.params;
  const role = auth.session.role as AppRole;

  try {
    const supabase = createServiceRoleClient();
    const { data: row, error } = await supabase
      .from("hub_messages")
      .select("id, body, created_at, user_id, channel_id")
      .eq("id", messageId)
      .maybeSingle();

    if (error || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { channel, error: chErr } = await getChannelForUser(supabase, row.channel_id as string, role);
    if (!channel) {
      return NextResponse.json({ error: chErr ?? "Forbidden" }, { status: chErr === "Forbidden" ? 403 : 404 });
    }

    const [message] = await enrichMessages(supabase, [
      {
        id: row.id as string,
        body: row.body as string,
        created_at: row.created_at as string,
        user_id: row.user_id as string,
      },
    ]);

    return NextResponse.json({ message });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
