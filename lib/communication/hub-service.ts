import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/types/user";

import { canAccessChannel } from "./channel-access";

export type HubMessageDto = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author_name: string;
  role: AppRole;
  branch_name: string | null;
};

export async function getChannelForUser(
  supabase: SupabaseClient,
  channelId: string,
  role: AppRole,
) {
  const { data, error } = await supabase
    .from("hub_channels")
    .select("id, slug, name, description, visible_roles, created_at")
    .eq("id", channelId)
    .maybeSingle();

  if (error || !data) return { channel: null, error: error?.message ?? "Not found" };
  if (!canAccessChannel({ visible_roles: data.visible_roles as string[] }, role)) {
    return { channel: null, error: "Forbidden" };
  }
  return { channel: data, error: null };
}

export async function enrichMessages(
  supabase: SupabaseClient,
  rows: Array<{ id: string; body: string; created_at: string; user_id: string }>,
): Promise<HubMessageDto[]> {
  if (!rows.length) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email, role, branch_id")
    .in("id", userIds);

  const branchIds = [...new Set((users ?? []).map((u) => u.branch_id).filter(Boolean))] as string[];
  const { data: branches } =
    branchIds.length > 0 ? await supabase.from("branches").select("id, name").in("id", branchIds) : { data: [] };

  const branchName = new Map((branches ?? []).map((b) => [b.id as string, b.name as string]));
  const userMap = new Map(
    (users ?? []).map((u) => [
      u.id as string,
      {
        name: (u.full_name && String(u.full_name).trim()) || String(u.email),
        role: u.role as AppRole,
        branch_name: u.branch_id ? (branchName.get(u.branch_id as string) ?? null) : null,
      },
    ]),
  );

  return rows.map((m) => {
    const u = userMap.get(m.user_id);
    return {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      user_id: m.user_id,
      author_name: u?.name ?? "User",
      role: u?.role ?? "branch_manager",
      branch_name: u?.branch_name ?? null,
    };
  });
}

export async function countMembersForRoles(supabase: SupabaseClient, visibleRoles: string[]) {
  const { count } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .in("role", visibleRoles)
    .eq("is_active", true);
  return count ?? 0;
}

export async function unreadCountForChannels(
  supabase: SupabaseClient,
  userId: string,
  channelIds: string[],
) {
  const unreadByChannel = new Map<string, number>();
  if (!channelIds.length) return unreadByChannel;

  const { data: reads } = await supabase
    .from("hub_channel_reads")
    .select("channel_id, last_read_at")
    .eq("user_id", userId)
    .in("channel_id", channelIds);

  const readMap = new Map<string, string>();
  for (const r of reads ?? []) readMap.set(r.channel_id as string, r.last_read_at as string);

  const { data: msgs } = await supabase
    .from("hub_messages")
    .select("id, channel_id, created_at")
    .in("channel_id", channelIds);

  for (const m of msgs ?? []) {
    const cid = m.channel_id as string;
    const last = readMap.get(cid) ?? "1970-01-01T00:00:00.000Z";
    if (new Date(m.created_at as string) > new Date(last)) {
      unreadByChannel.set(cid, (unreadByChannel.get(cid) ?? 0) + 1);
    }
  }

  return unreadByChannel;
}
