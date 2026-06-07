"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/Button";
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
  const [open, setOpen] = useState(defaultOpen);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [localUnread, setLocalUnread] = useState(unreadCount);

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
    if (open) {
      void load();
      void markRead();
    }
  }, [open, load, markRead]);

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

  return (
    <div className="mt-4 border-t border-[#1f2937] pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition",
          open
            ? "border-[#6366f1]/40 bg-[#6366f1]/10 text-white"
            : "border-[#374151] bg-[#0a0f1e] text-[#e5e7eb] hover:border-[#6366f1]/30",
          localUnread > 0 && !open && "border-amber-500/40 bg-amber-500/10",
        )}
      >
        <span className="flex items-center gap-2 font-medium">
          <MessageSquare className="size-4 shrink-0 text-[#a5b4fc]" />
          Discuss this report
          {localUnread > 0 ? (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-[#111827]">
              {localUnread} new
            </span>
          ) : null}
        </span>
        <span className="text-xs text-[#6b7280]">{open ? "Hide" : "Open"}</span>
      </button>

      {open ? (
        <div className="mt-3 rounded-lg border border-[#1f2937] bg-[#0a0f1e] p-3">
          {loading ? (
            <p className="flex items-center gap-2 py-4 text-sm text-[#9ca3af]">
              <Loader2 className="size-4 animate-spin" /> Loading discussion…
            </p>
          ) : error ? (
            <p className="py-3 text-sm text-red-300">{error}</p>
          ) : (
            <>
              <ul className="mb-3 max-h-64 space-y-3 overflow-y-auto pr-1">
                {comments.length === 0 ? (
                  <li className="py-2 text-center text-sm text-[#6b7280]">
                    {isHrViewer
                      ? "Ask the branch manager about this report (e.g. overtime, absences…)."
                      : "HR may ask questions here — reply when you have an update."}
                  </li>
                ) : (
                  comments.map((c) => {
                    const isStaff = c.user?.role === "hr" || c.user?.role === "super_admin";
                    const name = c.user?.full_name || c.user?.email || "User";
                    const initials = name.slice(0, 2).toUpperCase();
                    const mine =
                      (isHrViewer && isStaff) || (!isHrViewer && c.user?.role === "branch_manager");
                    return (
                      <li key={c.id} className={cn("flex gap-2", mine ? "flex-row-reverse text-right" : "")}>
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1f2937] text-[10px] font-bold text-[#a5b4fc]">
                          {initials}
                        </span>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                            mine ? "bg-[#6366f1]/25 text-[#e5e7eb]" : "bg-[#111827] text-[#d1d5db]",
                          )}
                        >
                          <p className="text-[10px] text-[#6b7280]">
                            <span className="font-semibold text-[#9ca3af]">{name}</span>
                            {" · "}
                            {new Date(c.created_at).toLocaleString()}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{c.message}</p>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>
              <div className="flex gap-2 border-t border-[#1f2937] pt-3">
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    isHrViewer ? "e.g. Why was overtime so high this period?" : "Write your reply…"
                  }
                  className="min-w-0 flex-1 rounded-lg border border-[#374151] bg-[#111827] px-3 py-2 text-sm text-white"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <Button type="button" disabled={sending} onClick={() => void send()}>
                  {sending ? "…" : "Send"}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
