import { NextResponse } from "next/server";

import { isDemoSession } from "@/lib/demo/guard";
import { demoChannels } from "@/lib/demo/mock-data";
import { canAccessChannel } from "@/lib/communication/channel-access";
import { requireGeneralManagerApi, requireHubUserApi } from "@/lib/communication/require-session";
import { countMembersForRoles, unreadCountForChannels } from "@/lib/communication/hub-service";
import { createServiceRoleClient } from "@/lib/supabase";
import type { AppRole } from "@/types/user";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export async function GET() {
  const auth = await requireHubUserApi();
  if (!auth.ok) return auth.response;
  if (isDemoSession(auth.session)) return NextResponse.json(demoChannels());

  try {
    const supabase = createServiceRoleClient();
    const role = auth.session.role as AppRole;
    const uid = auth.session.id;

    const { data: all, error } = await supabase
      .from("hub_channels")
      .select("id, slug, name, description, visible_roles, created_at")
      .order("name");

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({
          channels: [],
          warning: "Run migration 20260524000000_communication_hub.sql",
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const visible = (all ?? []).filter((c) =>
      canAccessChannel({ visible_roles: c.visible_roles as string[] }, role),
    );

    const channelIds = visible.map((c) => c.id as string);
    const unreadByChannel = await unreadCountForChannels(supabase, uid, channelIds);

    const channels = await Promise.all(
      visible.map(async (c) => ({
        id: c.id as string,
        slug: c.slug as string,
        name: c.name as string,
        description: (c.description as string | null) ?? null,
        visible_roles: c.visible_roles as string[],
        unread_count: unreadByChannel.get(c.id as string) ?? 0,
        member_count: await countMembersForRoles(supabase, c.visible_roles as string[]),
      })),
    );

    return NextResponse.json({ channels });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const auth = await requireGeneralManagerApi();
  if (!auth.ok) return auth.response;

  let body: { name?: string; description?: string; visible_roles?: string[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Channel name is required" }, { status: 400 });

  const roles = new Set<string>(["general_manager"]);
  for (const r of body.visible_roles ?? []) {
    if (r === "hr" || r === "branch_manager") roles.add(r);
  }

  const slugBase = slugify(name);
  if (!slugBase) return NextResponse.json({ error: "Invalid channel name" }, { status: 400 });

  try {
    const supabase = createServiceRoleClient();
    let slug = slugBase;
    let attempt = 0;
    while (attempt < 5) {
      const { data: existing } = await supabase.from("hub_channels").select("id").eq("slug", slug).maybeSingle();
      if (!existing) break;
      attempt += 1;
      slug = `${slugBase}-${attempt}`;
    }

    const { data, error } = await supabase
      .from("hub_channels")
      .insert({
        slug,
        name,
        description: String(body.description ?? "").trim() || null,
        visible_roles: [...roles],
        created_by: auth.session.id,
      })
      .select("id, slug, name, description, visible_roles")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ channel: data });
  } catch {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
  }
}
