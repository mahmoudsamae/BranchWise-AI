import type { SupabaseClient } from "@supabase/supabase-js";

import { getFruhstuckConfig } from "./client";

export type BreakfastBranchRow = { id: number; name: string; slug: string; is_active: boolean };

export type LinkBranchesResult = {
  linked: { branch_id: string; branch_name: string; external_id: string }[];
  created: { branch_id: string; branch_name: string; external_id: string }[];
  skipped: { breakfast_name: string; slug: string; reason: string }[];
  breakfast_api_ok: boolean;
  analytics_deployed: boolean | null;
};

function normalizeName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Infer breakfast slug from BranchWise branch display name. */
export function inferSlugFromBranchName(name: string): string | null {
  const n = normalizeName(name);
  if (n.includes("regensburg")) return "azur-camping-regensburg";
  if (n.includes("hannover")) return "hannover";
  if (n.includes("altmuhl")) return "altmuhltal";
  if (n.includes("ingolstadt")) return "ingolstadt";
  if (n.includes("schwab") || n.includes("schwb")) return "schwbische";
  if (n.includes("wertheim")) return "wertheim";
  return null;
}

function scoreMatch(bwName: string, breakfastName: string) {
  const a = normalizeName(bwName);
  const b = normalizeName(breakfastName);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 80;
  const aParts = a.split(" ").filter((p) => p.length > 2);
  const bParts = b.split(" ").filter((p) => p.length > 2);
  let hits = 0;
  for (const p of aParts) {
    if (bParts.some((q) => q.includes(p) || p.includes(q))) hits += 1;
  }
  return hits * 15;
}

export async function fetchBreakfastBranchList(): Promise<{
  branches: BreakfastBranchRow[];
  error: string | null;
}> {
  const cfg = getFruhstuckConfig();
  if (!cfg.ok) return { branches: [], error: cfg.error };

  try {
    const res = await fetch(`${cfg.baseUrl}/api/branches`, {
      headers: { "x-integration-token": cfg.token },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      return { branches: [], error: `Breakfast /api/branches HTTP ${res.status}` };
    }
    const json = JSON.parse(text) as { branches?: BreakfastBranchRow[] };
    return { branches: json.branches ?? [], error: null };
  } catch (e) {
    return { branches: [], error: e instanceof Error ? e.message : "Failed to fetch branches" };
  }
}

export async function linkBranchesFromBreakfastApi(
  supabase: SupabaseClient,
): Promise<LinkBranchesResult> {
  const result: LinkBranchesResult = {
    linked: [],
    created: [],
    skipped: [],
    breakfast_api_ok: false,
    analytics_deployed: null,
  };

  const { branches: breakfastBranches, error } = await fetchBreakfastBranchList();
  if (error) return { ...result, skipped: [{ breakfast_name: "", slug: "", reason: error }] };
  result.breakfast_api_ok = true;

  const { data: bwBranches, error: bwErr } = await supabase
    .from("branches")
    .select("id, name, external_id, is_active")
    .order("name");

  if (bwErr) {
    result.skipped.push({ breakfast_name: "", slug: "", reason: bwErr.message });
    return result;
  }

  const usedIds = new Set<string>();

  for (const bb of breakfastBranches) {
    if (!bb.is_active || !bb.slug?.trim()) {
      result.skipped.push({
        breakfast_name: bb.name,
        slug: bb.slug,
        reason: "Inactive or missing slug",
      });
      continue;
    }

    const slug = bb.slug.trim().toLowerCase();
    let best: { id: string; name: string; score: number } | null = null;

    for (const bw of bwBranches ?? []) {
      if (usedIds.has(bw.id)) continue;
      const inferred = inferSlugFromBranchName(bw.name);
      if (inferred === slug) {
        best = { id: bw.id, name: bw.name, score: 100 };
        break;
      }
      const score = scoreMatch(bw.name, bb.name);
      if (score > 0 && (!best || score > best.score)) {
        best = { id: bw.id, name: bw.name, score };
      }
    }

    if (best && (best.score >= 100 || best.score >= 45)) {
      const { error: upErr } = await supabase
        .from("branches")
        .update({ external_id: slug, is_active: true })
        .eq("id", best.id);

      if (upErr) {
        result.skipped.push({ breakfast_name: bb.name, slug, reason: upErr.message });
        continue;
      }

      usedIds.add(best.id);
      result.linked.push({ branch_id: best.id, branch_name: best.name, external_id: slug });
      continue;
    }

    const { data: inserted, error: insErr } = await supabase
      .from("branches")
      .insert({
        name: bb.name,
        location: null,
        external_id: slug,
        is_active: true,
      })
      .select("id, name")
      .single();

    if (insErr) {
      result.skipped.push({ breakfast_name: bb.name, slug, reason: insErr.message });
      continue;
    }

    usedIds.add(inserted.id);
    result.created.push({
      branch_id: inserted.id,
      branch_name: inserted.name,
      external_id: slug,
    });
  }

  return result;
}

export async function checkAnalyticsDeployed(): Promise<boolean> {
  const { probeBreakfastHealth } = await import("./health");
  const h = await probeBreakfastHealth();
  return h.analytics_route === "ok";
}
