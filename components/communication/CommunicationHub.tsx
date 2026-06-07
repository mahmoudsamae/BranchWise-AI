"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, Plus, Send, Settings, X } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase";
import type { HubMessageDto } from "@/lib/communication/hub-service";
import { visibleRolesLabel } from "@/lib/communication/channel-access";
import type { AppRole } from "@/types/user";

type HubChannel = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visible_roles: string[];
  unread_count: number;
  member_count: number;
};

export type CommunicationHubProps = {
  userRole: "general_manager" | "hr" | "branch_manager";
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0] ?? "";
    const b = parts[1]?.[0] ?? "";
    return `${a}${b}`.toUpperCase() || "?";
  }
  return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
}

function avatarColor(role: AppRole) {
  switch (role) {
    case "general_manager":
      return "bg-blue-600";
    case "hr":
      return "bg-amber-500";
    default:
      return "bg-emerald-600";
  }
}

function roleBadge(role: AppRole, branchName: string | null) {
  switch (role) {
    case "general_manager":
      return (
        <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-blue-300">GM</span>
      );
    case "hr":
      return (
        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-200">HR</span>
      );
    default:
      return (
        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-200">
          {branchName ?? "Branch"}
        </span>
      );
  }
}

function sameDay(a: string, b: string) {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(iso, today.toISOString())) return "Today";
  if (sameDay(iso, yesterday.toISOString())) return "Yesterday";
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(d);
}

export function CommunicationHub({ userRole }: CommunicationHubProps) {
  const canCreate = userRole === "general_manager";

  const [channels, setChannels] = useState<HubChannel[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<HubMessageDto[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVisibleHr, setNewVisibleHr] = useState(true);
  const [newVisibleBm, setNewVisibleBm] = useState(true);
  const [creating, setCreating] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const atBottomRef = useRef(true);

  const activeChannel = channels.find((c) => c.id === activeId) ?? null;

  const loadChannels = useCallback(async () => {
    const res = await fetch("/api/channels");
    const d = (await res.json()) as { channels?: HubChannel[] };
    if (!res.ok) return;
    setChannels(d.channels ?? []);
    setActiveId((cur) => {
      if (cur && d.channels?.some((c) => c.id === cur)) return cur;
      return d.channels?.[0]?.id ?? null;
    });
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    atBottomRef.current = true;
    setShowScrollDown(false);
  }, []);

  const loadMessages = useCallback(
    async (channelId: string) => {
      setLoadingMsgs(true);
      try {
        const res = await fetch(`/api/channels/${channelId}/messages`);
        const d = (await res.json()) as { messages?: HubMessageDto[] };
        if (res.ok) {
          setMessages(d.messages ?? []);
          requestAnimationFrame(() => scrollToBottom(false));
        }
      } finally {
        setLoadingMsgs(false);
      }
    },
    [scrollToBottom],
  );

  const markRead = useCallback(
    async (channelId: string) => {
      await fetch(`/api/channels/${channelId}/read`, { method: "POST" });
      void loadChannels();
    },
    [loadChannels],
  );

  const appendMessage = useCallback((msg: HubMessageDto) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
    if (atBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom());
    }
  }, [scrollToBottom]);

  useEffect(() => {
    void loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
    void markRead(activeId);
  }, [activeId, loadMessages, markRead]);

  useEffect(() => {
    if (!activeId) return;

    const supabase = createClient();
    const sub = supabase
      .channel(`hub_messages:${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "hub_messages",
          filter: `channel_id=eq.${activeId}`,
        },
        (payload) => {
          const id = (payload.new as { id?: string }).id;
          if (!id) return;
          void fetch(`/api/channels/messages/${id}`)
            .then((r) => r.json())
            .then((j: { message?: HubMessageDto }) => {
              if (j.message) appendMessage(j.message);
            });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(sub);
    };
  }, [activeId, appendMessage]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = nearBottom;
    setShowScrollDown(!nearBottom);
  };

  const send = async () => {
    if (!activeId || !text.trim() || sending) return;
    setSending(true);
    const content = text.trim();
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch(`/api/channels/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const d = (await res.json()) as { message?: HubMessageDto };
      if (res.ok && d.message) {
        appendMessage(d.message);
        void markRead(activeId);
      }
    } finally {
      setSending(false);
    }
  };

  const createChannel = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const visible_roles = ["general_manager"];
      if (newVisibleHr) visible_roles.push("hr");
      if (newVisibleBm) visible_roles.push("branch_manager");

      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), description: newDesc.trim(), visible_roles }),
      });
      if (res.ok) {
        setCreateOpen(false);
        setNewName("");
        setNewDesc("");
        await loadChannels();
      }
    } finally {
      setCreating(false);
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 72)}px`;
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Communication</h1>
        <p className="mt-1 text-sm text-[#9ca3af]">Company channels with live updates.</p>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border border-[#1f2937] bg-[#0a0f1e]">
        <aside className="flex w-[280px] shrink-0 flex-col border-r border-[#1f2937] bg-[#111827]">
          <p className="border-b border-[#1f2937] px-4 py-3 text-sm font-bold text-white">Channels</p>
          <ul className="flex-1 overflow-y-auto p-2">
            {channels.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition",
                    activeId === c.id ? "bg-[#6366f1] text-white" : "text-[#9ca3af] hover:bg-[#0a0f1e]/80 hover:text-white",
                  )}
                >
                  <span className={cn("truncate text-sm", c.unread_count > 0 && activeId !== c.id && "font-bold text-white")}>
                    {c.name}
                  </span>
                  {c.unread_count > 0 ? (
                    <span className="ml-2 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#6366f1] text-[10px] font-bold text-white">
                      {c.unread_count > 9 ? "9+" : c.unread_count}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
          {canCreate ? (
            <div className="border-t border-[#1f2937] p-3">
              <Button type="button" variant="secondary" className="w-full text-sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" aria-hidden />
                New Channel
              </Button>
            </div>
          ) : null}
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col">
          {activeChannel ? (
            <>
              <header className="border-b border-[#1f2937] px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h2 className="text-lg font-bold text-white">{activeChannel.name}</h2>
                    {activeChannel.description ? (
                      <p className="mt-0.5 text-sm text-[#9ca3af]">{activeChannel.description}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-[#6b7280]">
                      {activeChannel.member_count} members · Visible to {visibleRolesLabel(activeChannel.visible_roles)}
                    </p>
                  </div>
                  {canCreate ? (
                    <Button type="button" variant="ghost" className="text-xs" onClick={() => setManageOpen(true)}>
                      <Settings className="size-4" aria-hidden />
                      Manage Channel
                    </Button>
                  ) : null}
                </div>
              </header>

              <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 overflow-y-auto px-4 py-4">
                {loadingMsgs && messages.length === 0 ? (
                  <p className="text-sm text-[#9ca3af]">Loading messages…</p>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-[#9ca3af]">No messages yet. Start the conversation.</p>
                ) : (
                  <ul className="space-y-4">
                    {messages.map((m, i) => {
                      const prev = messages[i - 1];
                      const showDay = !prev || !sameDay(prev.created_at, m.created_at);
                      return (
                        <li key={m.id}>
                          {showDay ? (
                            <div className="my-4 flex items-center gap-3">
                              <div className="h-px flex-1 bg-[#1f2937]" />
                              <span className="text-xs font-medium text-[#6b7280]">{dayLabel(m.created_at)}</span>
                              <div className="h-px flex-1 bg-[#1f2937]" />
                            </div>
                          ) : null}
                          <div className="flex gap-3">
                            <div
                              className={cn(
                                "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                                avatarColor(m.role),
                              )}
                            >
                              {initials(m.author_name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-bold text-white">{m.author_name}</span>
                                {roleBadge(m.role, m.branch_name)}
                                <span className="text-xs text-[#6b7280]">
                                  {new Intl.DateTimeFormat("en-GB", { timeStyle: "short" }).format(new Date(m.created_at))}
                                </span>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#e5e7eb]">{m.body}</p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {showScrollDown ? (
                <button
                  type="button"
                  onClick={() => scrollToBottom()}
                  className="absolute bottom-28 right-6 flex items-center gap-1 rounded-full border border-[#6366f1]/50 bg-[#111827] px-3 py-1.5 text-xs font-medium text-[#c7d2fe] shadow-lg hover:bg-[#6366f1]/20"
                >
                  <ArrowDown className="size-3.5" aria-hidden />
                  New messages
                </button>
              ) : null}

              <footer className="border-t border-[#1f2937] p-4">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={text}
                    disabled={sending}
                    onChange={onInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder="Write a message…"
                    className="max-h-[72px] min-h-[44px] flex-1 resize-none rounded-xl border border-[#1f2937] bg-[#111827] px-4 py-2.5 text-sm text-white outline-none focus:border-[#6366f1] disabled:opacity-50"
                  />
                  <Button
                    type="button"
                    disabled={sending || !text.trim()}
                    className="size-11 shrink-0 rounded-xl p-0"
                    onClick={() => void send()}
                    aria-label={sending ? "Sending" : "Send"}
                  >
                    <Send className="size-5" aria-hidden />
                  </Button>
                </div>
                {sending ? <p className="mt-1 text-xs text-[#6b7280]">Sending…</p> : null}
              </footer>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-[#9ca3af]">Select a channel</div>
          )}
        </div>
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#1f2937] bg-[#111827] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">New Channel</h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-[#9ca3af] hover:text-white">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <label className="block text-sm font-medium text-[#9ca3af]">
              Channel name
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-[#6366f1]"
              />
            </label>
            <label className="mt-3 block text-sm font-medium text-[#9ca3af]">
              Description (optional)
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-3 py-2 text-sm text-white outline-none focus:border-[#6366f1]"
              />
            </label>
            <p className="mt-4 text-sm font-medium text-[#9ca3af]">Visible to</p>
            <ul className="mt-2 space-y-2 text-sm text-white">
              <li className="flex items-center gap-2 opacity-70">
                <input type="checkbox" checked disabled readOnly className="accent-[#6366f1]" />
                General Manager (always)
              </li>
              <li className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newVisibleHr}
                  onChange={(e) => setNewVisibleHr(e.target.checked)}
                  className="accent-[#6366f1]"
                />
                HR
              </li>
              <li className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newVisibleBm}
                  onChange={(e) => setNewVisibleBm(e.target.checked)}
                  className="accent-[#6366f1]"
                />
                Branch Manager
              </li>
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={creating || !newName.trim()} onClick={() => void createChannel()}>
                Create
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {manageOpen && activeChannel ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-[#1f2937] bg-[#111827] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Manage Channel</h3>
              <button type="button" onClick={() => setManageOpen(false)} className="text-[#9ca3af] hover:text-white">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <p className="text-sm text-[#9ca3af]">
              <span className="font-semibold text-white">{activeChannel.name}</span> ({activeChannel.slug})
            </p>
            {activeChannel.description ? (
              <p className="mt-2 text-sm text-[#e5e7eb]">{activeChannel.description}</p>
            ) : null}
            <p className="mt-3 text-xs text-[#6b7280]">Visible to: {visibleRolesLabel(activeChannel.visible_roles)}</p>
            <p className="mt-1 text-xs text-[#6b7280]">{activeChannel.member_count} members with access</p>
            <div className="mt-6 flex justify-end">
              <Button type="button" onClick={() => setManageOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
