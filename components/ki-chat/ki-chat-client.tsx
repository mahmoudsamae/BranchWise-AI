"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

import { SimpleMarkdown } from "./simple-markdown";

type ContextMode = "reports" | "communication";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

const SUGGESTIONS = [
  "Which branch was weakest last month?",
  "What are the biggest operational risks?",
  "Which branch has the highest revenue?",
  "What trends do the last reports show?",
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-[#9ca3af]">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 animate-bounce rounded-full bg-[#6366f1]"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      Analyzing your data…
    </div>
  );
}

export function KiChatClient() {
  const [contextMode, setContextMode] = useState<ContextMode>("reports");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const loadHistory = useCallback(async () => {
    const res = await fetch("/api/ki-chat/history");
    if (!res.ok) return;
    const j = (await res.json()) as { messages?: ChatMessage[] };
    setMessages(
      (j.messages ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      })),
    );
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streamBuffer, streaming]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    const userMsg: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);
    setStreamBuffer("");

    try {
      const res = await fetch("/api/ki-chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, context_mode: contextMode }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text();
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: errText || "Request failed",
            created_at: new Date().toISOString(),
          },
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreamBuffer(acc);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: acc,
          created_at: new Date().toISOString(),
        },
      ]);
      setStreamBuffer("");
      void loadHistory();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Connection error. Please try again.",
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setStreaming(false);
      setStreamBuffer("");
    }
  };

  const clearHistory = async () => {
    if (!window.confirm("Clear all chat history?")) return;
    await fetch("/api/ki-chat/history", { method: "DELETE" });
    setMessages([]);
    setStreamBuffer("");
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  const empty = messages.length === 0 && !streaming;

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col rounded-xl border border-[#1f2937] bg-[#0a0f1e]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f2937] px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[#a5b4fc]" aria-hidden />
          <h1 className="text-lg font-bold text-white">KI-Assistant</h1>
        </div>
        <Button type="button" variant="ghost" className="text-xs" onClick={() => void clearHistory()}>
          Clear history
        </Button>
      </header>

      <div className="flex gap-2 border-b border-[#1f2937] px-4 py-2">
        {(
          [
            { id: "reports" as const, label: "Use latest reports" },
            { id: "communication" as const, label: "Use team discussion" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            disabled={streaming}
            onClick={() => setContextMode(tab.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              contextMode === tab.id
                ? "bg-[#6366f1] text-white"
                : "bg-[#111827] text-[#9ca3af] hover:text-white",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {empty ? (
          <div className="flex flex-col items-center justify-center gap-4 py-12">
            <p className="text-sm text-[#9ca3af]">Ask about branches, KPIs, or team discussions.</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void sendMessage(q)}
                  className="rounded-full border border-[#6366f1]/40 bg-[#6366f1]/10 px-4 py-2 text-sm text-[#c7d2fe] hover:bg-[#6366f1]/20"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {messages.map((m) => (
              <li key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" ? (
                  <div className="max-w-[85%]">
                    <p className="mb-1 text-xs font-medium text-[#a5b4fc]">BranchWise AI</p>
                    <div className="rounded-2xl rounded-tl-none border border-[#1f2937] bg-[#1f2937] px-4 py-3 text-[#f9fafb]">
                      <SimpleMarkdown text={m.content} />
                    </div>
                    <p className="mt-1 text-xs text-[#6b7280]">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                ) : (
                  <div className="max-w-[85%]">
                    <div className="rounded-2xl rounded-tr-none bg-[#6366f1] px-4 py-3 text-white">
                      <p className="whitespace-pre-wrap text-sm">{m.content}</p>
                    </div>
                    <p className="mt-1 text-right text-xs text-[#6b7280]">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                )}
              </li>
            ))}
            {streaming && streamBuffer ? (
              <li className="flex justify-start">
                <div className="max-w-[85%]">
                  <p className="mb-1 text-xs font-medium text-[#a5b4fc]">BranchWise AI</p>
                  <div className="rounded-2xl rounded-tl-none border border-[#1f2937] bg-[#1f2937] px-4 py-3 text-[#f9fafb]">
                    <SimpleMarkdown text={streamBuffer} />
                  </div>
                </div>
              </li>
            ) : null}
            {streaming && !streamBuffer ? (
              <li>
                <TypingIndicator />
              </li>
            ) : null}
          </ul>
        )}
      </div>

      <footer className="border-t border-[#1f2937] p-4">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            disabled={streaming}
            onChange={onInput}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            placeholder="Ask BranchWise AI…"
            className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-xl border border-[#1f2937] bg-[#111827] px-4 py-2.5 text-sm text-white outline-none focus:border-[#6366f1] disabled:opacity-50"
          />
          <Button
            type="button"
            disabled={streaming || !input.trim()}
            className="size-11 shrink-0 rounded-xl p-0"
            onClick={() => void sendMessage(input)}
            aria-label="Send"
          >
            <ArrowUp className="size-5" aria-hidden />
          </Button>
        </div>
      </footer>
    </div>
  );
}
