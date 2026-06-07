import { Redis } from "@upstash/redis";

import { buildKiChatContext, type ContextMode } from "@/lib/ki-chat/build-context";
import { streamOpenAiChat, type ChatMessage } from "@/lib/ki-chat/openai-stream";
import { KI_CHAT_SYSTEM_PROMPT } from "@/lib/ki-chat/system-prompt";
import { requireGmOrHrApi } from "@/lib/gm-hr/require-session";
import { createServiceRoleClient } from "@/lib/supabase";

export const runtime = "nodejs";

const KI_CHAT_DAILY_TTL_SECONDS = 86_400;

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

function getKiChatDailyLimit(): number {
  const parsed = Number(process.env.KI_CHAT_DAILY_LIMIT ?? 50);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
}

async function consumeKiChatDailyMessage(userId: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;

  const today = new Date().toISOString().slice(0, 10);
  const key = `ki_chat:${userId}:${today}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, KI_CHAT_DAILY_TTL_SECONDS);
  }
  return count <= getKiChatDailyLimit();
}

export async function POST(request: Request) {
  const auth = await requireGmOrHrApi();
  if (!auth.ok) return auth.response;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response("OPENAI_API_KEY is not configured on the server.", { status: 503 });
  }

  let body: { message?: string; context_mode?: ContextMode };
  try {
    body = (await request.json()) as { message?: string; context_mode?: ContextMode };
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (!message) return new Response("Message is required", { status: 400 });

  const contextMode: ContextMode = body.context_mode === "communication" ? "communication" : "reports";
  const hrOnly = auth.session.role === "hr";

  const allowed = await consumeKiChatDailyMessage(auth.session.id);
  if (!allowed) {
    return Response.json({ error: "Daily message limit reached. Resets at midnight." }, { status: 429 });
  }

  try {
    const supabase = createServiceRoleClient();
    const contextString = await buildKiChatContext(supabase, contextMode, hrOnly);

    const { data: dbHistory } = await supabase
      .from("ki_chat_history")
      .select("role, content")
      .eq("user_id", auth.session.id)
      .order("created_at", { ascending: false })
      .limit(30);

    const last30 = [...(dbHistory ?? [])].reverse().map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content as string,
    }));

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: `${KI_CHAT_SYSTEM_PROMPT}\n\n=== DATA CONTEXT ===\n${contextString}`,
      },
      ...last30,
      { role: "user", content: message },
    ];

    const encoder = new TextEncoder();
    let assistantText = "";

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const text of streamOpenAiChat(apiKey, messages)) {
            assistantText += text;
            controller.enqueue(encoder.encode(text));
          }
          controller.close();

          await supabase.from("ki_chat_history").insert([
            { user_id: auth.session.id, role: "user", content: message, context_mode: contextMode },
            {
              user_id: auth.session.id,
              role: "assistant",
              content: assistantText || "(no response)",
              context_mode: contextMode,
            },
          ]);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Stream error";
          controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return new Response(msg, { status: 500 });
  }
}
