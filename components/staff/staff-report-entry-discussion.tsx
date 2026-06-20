"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquare, Send } from "lucide-react";

import { cn } from "@/lib/cn";

type CommentUser = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
};

type Comment = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  user: CommentUser | null;
};

function roleLabel(role: string | undefined): string {
  if (role === "hr" || role === "super_admin") return "HR";
  if (role === "branch_manager") return "Branch";
  return "Team";
}

function formatChatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    const time = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(d);
    if (sameDay) return `Heute, ${time}`;
    return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d);
  } catch {
    return iso;
  }
}

export function StaffReportEntryDiscussion({
  entryId,
  staffMemberId: _staffMemberId,
  viewerRole,
  unreadCount = 0,
  defaultOpen = false,
}: {
  entryId: string;
  staffMemberId: string;
  viewerRole: "hr" | "branch";
  unreadCount?: number;
  defaultOpen?: boolean;
}) {
  const [loaded, setLoaded] = useState(defaultOpen);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [localUnread, setLocalUnread] = useState(unreadCount);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalUnread(unreadCount);
  }, [unreadCount]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff-report-entries/${entryId}/comments`);
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        setError(j.error ?? "Failed to load discussion");
        return;
      }
      const j = (await res.json()) as { comments?: Comment[] };
      setComments(j.comments ?? []);
    } catch {
      setError("Request failed");
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  const markRead = useCallback(async () => {
    await fetch(`/api/staff-report-entries/${entryId}/comments/read`, { method: "POST" });
    setLocalUnread(0);
  }, [entryId]);

  useEffect(() => {
    if (loaded) {
      void load();
      void markRead();
    }
  }, [loaded, load, markRead]);

  useEffect(() => {
    if (defaultOpen) setLoaded(true);
  }, [defaultOpen]);

  useEffect(() => {
    if (loaded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments, loaded]);

  async function send() {
    const text = message.trim();
    if (!text) return;
    setSending(true);
    try {
      const res = await fetch(`/api/staff-report-entries/${entryId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        alert(j.error ?? "Failed to send");
        return;
      }
      const j = (await res.json()) as { comment?: Comment };
      if (j.comment) setComments((prev) => [...prev, j.comment!]);
      setMessage("");
    } finally {
      setSending(false);
    }
  }

  const isHrViewer = viewerRole === "hr";

  function isMine(c: Comment): boolean {
    const isStaff = c.user?.role === "hr" || c.user?.role === "super_admin";
    return (isHrViewer && isStaff) || (!isHrViewer && c.user?.role === "branch_manager");
  }

  if (!loaded) {
    return (
      <button
        type="button"
        onClick={() => setLoaded(true)}
        className={cn(
          "mt-4 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition hover:border-[#6366f1]/40",
          localUnread > 0
            ? "border-amber-500/40 bg-amber-500/10 text-amber-100"
            : "border-[#374151] bg-[#0a0f1e] text-[#9ca3af] hover:text-white",
        )}
      >
        <span className="flex items-center gap-2">
          <MessageSquare className="size-4 shrink-0" />
          Discussion
          {localUnread > 0 ? (
            <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-[#111827]">
              {localUnread} new
            </span>
          ) : null}
        </span>
        <span className="text-xs text-[#6b7280]">Open chat →</span>
      </button>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-[#374151] bg-[#0a0f1e]">
      <div className="flex items-center justify-between border-b border-[#1f2937] px-4 py-2.5">
        <p className="text-sm font-medium text-[#e5e7eb]">
          Discussion
          {comments.length > 0 ? (
            <span className="ml-2 text-xs font-normal text-[#6b7280]">({comments.length})</span>
          ) : null}
        </p>
        <p className="text-[10px] text-[#6b7280]">
          {isHrViewer ? "Ask the branch manager" : "Reply to HR questions"}
        </p>
      </div>

      <div ref={scrollRef} className="max-h-56 space-y-3 overflow-y-auto px-4 py-3">
        {loading ? (
          <p className="flex items-center justify-center gap-2 py-6 text-sm text-[#9ca3af]">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </p>
        ) : error ? (
          <p className="py-4 text-center text-sm text-red-300">{error}</p>
        ) : comments.length === 0 ? (
          <p className="py-4 text-center text-sm text-[#6b7280]">
            {isHrViewer
              ? "No messages yet — ask about overtime, absences, or performance."
              : "No messages yet — HR may ask questions here."}
          </p>
        ) : (
          comments.map((c) => {
            const mine = isMine(c);
            const name = c.user?.full_name || c.user?.email || "User";
            return (
              <div key={c.id} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
                <div className={cn("flex items-center gap-2 text-[10px] text-[#6b7280]", mine && "flex-row-reverse")}>
                  <span className="font-medium text-[#9ca3af]">{name}</span>
                  <span className="rounded bg-[#1f2937] px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
                    {roleLabel(c.user?.role)}
                  </span>
                  <span>{formatChatTime(c.created_at)}</span>
                </div>
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                    mine ? "rounded-br-md bg-[#6366f1] text-white" : "rounded-bl-md bg-[#111827] text-[#e5e7eb]",
                  )}
                >
                  {c.message}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-end gap-2 border-t border-[#1f2937] px-3 py-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isHrViewer ? "Ask a question…" : "Write a reply…"}
          rows={1}
          className="min-h-[40px] max-h-24 min-w-0 flex-1 resize-none rounded-xl border border-[#374151] bg-[#111827] px-3 py-2 text-sm text-white placeholder:text-[#6b7280] focus:border-[#6366f1]/50 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          disabled={sending || !message.trim()}
          onClick={() => void send()}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#6366f1] text-white transition hover:bg-[#4f46e5] disabled:opacity-40"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </button>
      </div>
    </div>
  );
}
