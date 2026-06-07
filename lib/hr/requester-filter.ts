import type { SupabaseClient } from "@supabase/supabase-js";

import type { AppRole } from "@/types/user";

import { requesterRolesForViewer, templateTypesForRole } from "./role-scope";

/** User ids allowed to create requests visible to this viewer role. */
export async function getRequesterUserIds(
  supabase: SupabaseClient,
  viewerRole: AppRole,
): Promise<string[]> {
  const roles = requesterRolesForViewer(viewerRole);
  if (!roles) return [];
  const { data } = await supabase.from("users").select("id").in("role", roles);
  return (data ?? []).map((u) => u.id as string);
}

export async function getTemplateIdsForRole(
  supabase: SupabaseClient,
  viewerRole: AppRole,
): Promise<string[]> {
  const types = templateTypesForRole(viewerRole);
  if (!types) return [];
  const { data } = await supabase.from("templates").select("id").in("type", types);
  return (data ?? []).map((t) => t.id as string);
}

export async function getScopedRequestIds(
  supabase: SupabaseClient,
  viewerRole: AppRole,
): Promise<string[]> {
  const [userIds, templateIds] = await Promise.all([
    getRequesterUserIds(supabase, viewerRole),
    getTemplateIdsForRole(supabase, viewerRole),
  ]);
  if (userIds.length === 0 || templateIds.length === 0) return [];

  const { data } = await supabase
    .from("report_requests")
    .select("id")
    .in("requested_by", userIds)
    .in("template_id", templateIds);

  return (data ?? []).map((r) => r.id as string);
}
