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

const ISSUE_KEYWORDS = ["problem", "fehler", "kaputt", "defekt", "issue", "broken", "not working"];
const DECISION_KEYWORDS = ["entschieden", "beschlossen", "agreed", "decided"];

function bodyMatchesKeywords(body: string, keywords: string[]): boolean {
  const lower = body.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function bodySnippet(body: string, max = 120): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max - 1) + "…";
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
    .select("branch_id, period_start, period_end, occupancy_rate, negative_feedback, created_at, report_id")
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
      `Branch: ${kpiBranchName.get(k.branch_id as string) ?? "?"} | Week: ${week} | Occupancy: ${k.occupancy_rate ?? "n/a"}% | Negative feedback: ${k.negative_feedback ?? 0}`,
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

  const today = new Date().toISOString().slice(0, 10);

  const { data: allRequests } = await supabase
    .from("report_requests")
    .select("id, branch_id, template_id, due_date, period_start, period_end, status")
    .order("due_date", { ascending: false })
    .limit(60);

  let reqList = allRequests ?? [];
  if (hrTemplateIds) {
    reqList = reqList.filter((r) => hrTemplateIds!.has(r.template_id as string));
  }

  const reqBranchIds = [...new Set(reqList.map((r) => r.branch_id))];
  const reqTemplateIds = [...new Set(reqList.map((r) => r.template_id))];

  const [{ data: reqBranches }, { data: reqTemplates }] = await Promise.all([
    reqBranchIds.length ? supabase.from("branches").select("id, name").in("id", reqBranchIds) : { data: [] },
    reqTemplateIds.length
      ? supabase.from("templates").select("id, title").in("id", reqTemplateIds)
      : { data: [] },
  ]);

  const reqBranchName = new Map((reqBranches ?? []).map((b) => [b.id, b.name]));
  const reqTplTitle = new Map((reqTemplates ?? []).map((t) => [t.id, t.title]));

  const overdueRequests = reqList.filter(
    (r) => r.status === "pending" && String(r.due_date) < today,
  );
  const pendingOnTime = reqList.filter(
    (r) => r.status === "pending" && String(r.due_date) >= today,
  );

  lines.push("");
  lines.push("=== OVERDUE REPORT REQUESTS ===");
  if (overdueRequests.length === 0) {
    lines.push("(none)");
  } else {
    for (const r of overdueRequests) {
      const bname = reqBranchName.get(r.branch_id as string) ?? "Unknown";
      const ttitle = reqTplTitle.get(r.template_id as string) ?? "Unknown";
      const due = String(r.due_date);
      const period = String(r.period_start) + " to " + String(r.period_end);
      lines.push(
        "CRITICAL: " + bname + " | " + ttitle + " | due " + due + " | period " + period,
      );
    }
  }

  lines.push("");
  lines.push("=== PENDING REPORT REQUESTS ===");
  if (pendingOnTime.length === 0) {
    lines.push("(none)");
  } else {
    for (const r of pendingOnTime) {
      const bname = reqBranchName.get(r.branch_id as string) ?? "Unknown";
      const ttitle = reqTplTitle.get(r.template_id as string) ?? "Unknown";
      const due = String(r.due_date);
      const period = String(r.period_start) + " to " + String(r.period_end);
      lines.push(bname + " | " + ttitle + " | due " + due + " | period " + period);
    }
  }

  const { data: punctReports } = await supabase
    .from("reports")
    .select("branch_id, template_id, request_id, submitted_at")
    .in("status", ["submitted", "reviewed"])
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(100);

  let punctList = punctReports ?? [];
  if (hrTemplateIds) {
    punctList = punctList.filter((r) => hrTemplateIds!.has(r.template_id as string));
  }

  const punctRequestIds = [...new Set(punctList.map((r) => r.request_id))];
  const { data: punctReqs } =
    punctRequestIds.length > 0
      ? await supabase.from("report_requests").select("id, due_date").in("id", punctRequestIds)
      : { data: [] };
  const punctDueMap = new Map((punctReqs ?? []).map((r) => [r.id, String(r.due_date)]));

  const punctBranchIds = [...new Set(punctList.map((r) => r.branch_id))];
  const { data: punctBranches } =
    punctBranchIds.length > 0
      ? await supabase.from("branches").select("id, name").in("id", punctBranchIds)
      : { data: [] };
  const punctBranchName = new Map((punctBranches ?? []).map((b) => [b.id, b.name]));

  const punctByBranch = new Map<string, { onTime: number; total: number; late: number }>();
  for (const r of punctList) {
    const bid = r.branch_id as string;
    const due = punctDueMap.get(r.request_id as string);
    if (!due) continue;
    const submittedDate = String(r.submitted_at).slice(0, 10);
    const cur = punctByBranch.get(bid) ?? { onTime: 0, total: 0, late: 0 };
    cur.total += 1;
    if (submittedDate <= due) cur.onTime += 1;
    else cur.late += 1;
    punctByBranch.set(bid, cur);
  }

  lines.push("");
  lines.push("=== SUBMISSION PUNCTUALITY PER BRANCH ===");
  if (punctByBranch.size === 0) {
    lines.push("(no submitted reports with due dates)");
  } else {
    for (const [bid, stats] of punctByBranch) {
      const bname = punctBranchName.get(bid) ?? "Unknown";
      const pct = stats.total > 0 ? Math.round((stats.onTime / stats.total) * 100) : 0;
      lines.push(
        bname +
          ": " +
          String(stats.onTime) +
          "/" +
          String(stats.total) +
          " on time (" +
          String(pct) +
          "%) - " +
          String(stats.late) +
          " late",
      );
    }
  }

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

  type HubMsg = (typeof list)[number];
  const authorOf = (m: HubMsg) => {
    const u = userMap.get(m.user_id as string);
    return (u?.full_name && String(u.full_name).trim()) || u?.email || "User";
  };

  const issueMatches = [...list]
    .reverse()
    .filter((m) => bodyMatchesKeywords(String(m.body), ISSUE_KEYWORDS));
  const decisionMatches = [...list]
    .reverse()
    .filter((m) => bodyMatchesKeywords(String(m.body), DECISION_KEYWORDS));

  lines.push("");
  lines.push("=== OPEN ISSUES SUMMARY ===");
  if (issueMatches.length === 0) {
    lines.push("(no potential issues detected in recent messages)");
  } else {
    for (const m of issueMatches) {
      const date = String(m.created_at).slice(0, 16);
      const who = authorOf(m);
      const snippet = bodySnippet(String(m.body));
      lines.push("[" + date + " | " + who + "] " + snippet);
    }
  }

  lines.push("");
  lines.push("=== RECENT DECISIONS ===");
  if (decisionMatches.length === 0) {
    lines.push("(no decisions detected in recent messages)");
  } else {
    for (const m of decisionMatches) {
      const date = String(m.created_at).slice(0, 16);
      const who = authorOf(m);
      const snippet = bodySnippet(String(m.body));
      lines.push("[" + date + " | " + who + "] " + snippet);
    }
  }

  return lines.join("\n");
}
