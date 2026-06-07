import { Redis } from "@upstash/redis";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ContextMode = "reports" | "communication";

const KI_CONTEXT_CACHE_TTL_SECONDS = 300;

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

async function getCachedContext(key: string, build: () => Promise<string>): Promise<string> {
  const redis = getRedis();
  if (redis) {
    const cached = await redis.get<string>(key);
    if (cached) return cached;
  }

  const result = await build();
  if (redis) {
    await redis.set(key, result, { ex: KI_CONTEXT_CACHE_TTL_SECONDS });
  }
  return result;
}

function formatReportData(data: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, val] of Object.entries(data)) {
    if (val === null || val === undefined || val === "") continue;
    parts.push(`${key}: ${typeof val === "object" ? JSON.stringify(val) : val}`);
  }
  return parts.length ? parts.join(" | ") : "(no field data)";
}

export async function buildKiChatContext(
  supabase: SupabaseClient,
  mode: ContextMode,
  hrOnly: boolean,
): Promise<string> {
  if (mode === "communication") {
    return buildCommunicationContext(supabase);
  }
  return buildReportsContext(supabase, hrOnly);
}

async function buildReportsContext(supabase: SupabaseClient, hrOnly: boolean) {
  const cacheKey = hrOnly ? "ki_ctx:reports:hr" : "ki_ctx:reports";
  return getCachedContext(cacheKey, () => buildReportsContextFromDb(supabase, hrOnly));
}

async function buildReportsContextFromDb(supabase: SupabaseClient, hrOnly: boolean) {
  let hrTemplateIds: Set<string> | null = null;
  if (hrOnly) {
    const { data: tpls } = await supabase.from("templates").select("id").eq("type", "hr");
    hrTemplateIds = new Set((tpls ?? []).map((t) => t.id as string));
    if (hrTemplateIds.size === 0) {
      return "=== BRANCH REPORTS ===\nNo HR templates found.\n";
    }
  }

  const { data: reports } = await supabase
    .from("reports")
    .select("id, branch_id, template_id, data, submitted_at, status, request_id")
    .in("status", ["submitted", "reviewed"])
    .order("submitted_at", { ascending: false })
    .limit(50);

  let repList = reports ?? [];
  if (hrTemplateIds) repList = repList.filter((r) => hrTemplateIds!.has(r.template_id as string));

  const branchIds = [...new Set(repList.map((r) => r.branch_id))];
  const templateIds = [...new Set(repList.map((r) => r.template_id))];
  const requestIds = [...new Set(repList.map((r) => r.request_id))];

  const [{ data: branches }, { data: templates }, { data: requests }] = await Promise.all([
    branchIds.length ? supabase.from("branches").select("id, name").in("id", branchIds) : { data: [] },
    templateIds.length ? supabase.from("templates").select("id, title, type").in("id", templateIds) : { data: [] },
    requestIds.length ? supabase.from("report_requests").select("id, period_start, period_end").in("id", requestIds) : { data: [] },
  ]);

  const branchName = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const tplMap = new Map((templates ?? []).map((t) => [t.id, { title: t.title, type: t.type }]));
  const reqMap = new Map((requests ?? []).map((r) => [r.id, r]));

  const lines: string[] = ["=== BRANCH REPORTS (Last 50) ==="];
  for (const r of repList) {
    const tpl = tplMap.get(r.template_id as string);
    const rr = reqMap.get(r.request_id as string);
    const bname = branchName.get(r.branch_id as string) ?? "Unknown";
    const period = rr ? `${rr.period_start} to ${rr.period_end}` : "n/a";
    const data = (r.data as Record<string, unknown>) ?? {};
    lines.push(
      `[Branch: ${bname} | Type: ${tpl?.type ?? "n/a"} | Template: ${tpl?.title ?? "n/a"} | Period: ${period}]`,
    );
    lines.push(formatReportData(data));
    lines.push("");
  }
  if (repList.length === 0) lines.push("(no submitted reports)");

  const { data: kpis } = await supabase
    .from("kpis")
    .select("branch_id, period_start, period_end, revenue, occupancy_rate, negative_feedback, created_at, report_id")
    .order("created_at", { ascending: false })
    .limit(30);

  let kpiList = kpis ?? [];
  if (hrTemplateIds && kpiList.length > 0) {
    const reportIds = new Set(repList.map((r) => r.id));
    kpiList = kpiList.filter((k) => reportIds.has(k.report_id as string));
  }

  const kpiBranchIds = [...new Set(kpiList.map((k) => k.branch_id))];
  const { data: kpiBranches } =
    kpiBranchIds.length > 0 ? await supabase.from("branches").select("id, name").in("id", kpiBranchIds) : { data: [] };
  const kpiBranchName = new Map((kpiBranches ?? []).map((b) => [b.id, b.name]));

  lines.push("=== KPI SUMMARY ===");
  for (const k of kpiList) {
    const week = String(k.period_end ?? k.created_at).slice(0, 10);
    lines.push(
      `Branch: ${kpiBranchName.get(k.branch_id as string) ?? "?"} | Week: ${week} | Revenue: €${k.revenue ?? 0} | Occupancy: ${k.occupancy_rate ?? "n/a"}% | Negative feedback: ${k.negative_feedback ?? 0}`,
    );
  }
  if (kpiList.length === 0) lines.push("(no KPI rows)");

  const { data: summaries } = await supabase
    .from("ai_summaries")
    .select("summary, generated_at, branch_id")
    .order("generated_at", { ascending: false })
    .limit(5);

  lines.push("");
  lines.push("=== AI SUMMARIES ===");
  for (const s of summaries ?? []) {
    const date = s.generated_at ? String(s.generated_at).slice(0, 10) : "?";
    lines.push(`${date}: ${String(s.summary).slice(0, 500)}`);
  }
  if (!summaries?.length) lines.push("(no AI summaries)");

  return lines.join("\n");
}

async function buildCommunicationContext(supabase: SupabaseClient) {
  return getCachedContext("ki_ctx:communication", () => buildCommunicationContextFromDb(supabase));
}

async function buildCommunicationContextFromDb(supabase: SupabaseClient) {
  const { data: msgs } = await supabase
    .from("hub_messages")
    .select("id, body, created_at, user_id, channel_id")
    .order("created_at", { ascending: false })
    .limit(100);

  const list = [...(msgs ?? [])].reverse();
  const channelIds = [...new Set(list.map((m) => m.channel_id))];
  const userIds = [...new Set(list.map((m) => m.user_id))];

  const [{ data: channels }, { data: users }] = await Promise.all([
    channelIds.length
      ? supabase.from("hub_channels").select("id, name, slug").in("id", channelIds)
      : { data: [] },
    userIds.length ? supabase.from("users").select("id, full_name, email, role").in("id", userIds) : { data: [] },
  ]);

  const chMap = new Map((channels ?? []).map((c) => [c.id, c]));
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  const lines: string[] = ["=== TEAM DISCUSSION (Last 100 messages) ==="];
  for (const m of list) {
    const ch = chMap.get(m.channel_id as string);
    const u = userMap.get(m.user_id as string);
    const who = (u?.full_name && String(u.full_name).trim()) || u?.email || "User";
    const role = u?.role ?? "unknown";
    const channel = ch ? `${ch.name} (${ch.slug})` : "channel";
    lines.push(`[${String(m.created_at).slice(0, 16)} | ${who} | ${role} | ${channel}]`);
    lines.push(String(m.body));
    lines.push("");
  }
  if (list.length === 0) lines.push("(no messages)");

  return lines.join("\n");
}
