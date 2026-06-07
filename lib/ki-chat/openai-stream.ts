export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const MAX_OPENAI_TOKENS = 1500;

/**
 * Streams GPT-4o chat completions via the OpenAI HTTP API (no SDK required).
 */
export async function* streamOpenAiChat(
  apiKey: string,
  messages: ChatMessage[],
  options?: { maxTokens?: number; temperature?: number },
): AsyncGenerator<string> {
  const maxTokens = Math.min(options?.maxTokens ?? 1000, MAX_OPENAI_TOKENS);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      stream: true,
      max_tokens: maxTokens,
      temperature: options?.temperature ?? 0.3,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(errBody || `OpenAI request failed (${res.status})`);
  }

  if (!res.body) throw new Error("OpenAI returned an empty response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;

      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const text = json.choices?.[0]?.delta?.content;
        if (text) yield text;
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
}
