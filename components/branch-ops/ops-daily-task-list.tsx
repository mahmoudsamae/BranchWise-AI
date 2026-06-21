"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { OPS_TIME_GROUPS, type OpsTimeGroup } from "@/lib/branch-ops/time-groups";

export type OpsDailyTaskItem = {
  id: string;
  label: string;
  time_hint: string | null;
  time_group: OpsTimeGroup;
  completed: boolean;
  staff_name: string | null;
  completed_at: string | null;
};

type StaffOption = { id: string; full_name: string };

const STAFF_BADGE_STYLES = [
  "bg-emerald-500/20 text-emerald-200 ring-emerald-500/30",
  "bg-orange-500/20 text-orange-200 ring-orange-500/30",
  "bg-violet-500/20 text-violet-200 ring-violet-500/30",
  "bg-sky-500/20 text-sky-200 ring-sky-500/30",
  "bg-amber-500/20 text-amber-200 ring-amber-500/30",
  "bg-rose-500/20 text-rose-200 ring-amber-500/30",
];

function staffBadgeStyle(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return STAFF_BADGE_STYLES[Math.abs(h) % STAFF_BADGE_STYLES.length]!;
}

function formatTime(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function defaultCollapsedState(
  grouped: { group: { id: OpsTimeGroup }; items: OpsDailyTaskItem[] }[],
): Record<OpsTimeGroup, boolean> {
  const state = {} as Record<OpsTimeGroup, boolean>;
  for (const { group, items } of grouped) {
    const openCount = items.filter((i) => !i.completed).length;
    // Collapse sections with no open tasks; keep first section with open tasks expanded
    state[group.id] = openCount === 0;
  }
  const firstWithOpen = grouped.find((g) => g.items.some((i) => !i.completed));
  if (firstWithOpen) {
    state[firstWithOpen.group.id] = false;
  } else if (grouped[0]) {
    state[grouped[0].group.id] = false;
  }
  return state;
}

export function OpsDailyTaskList({
  items,
  staff,
  readOnly = false,
  savingItemId,
  onComplete,
}: {
  items: OpsDailyTaskItem[];
  staff?: StaffOption[];
  readOnly?: boolean;
  savingItemId?: string | null;
  onComplete?: (itemId: string, staffId: string) => Promise<void>;
}) {
  const [staffPick, setStaffPick] = useState<Record<string, string>>({});
  const [openAssign, setOpenAssign] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<OpsTimeGroup, OpsDailyTaskItem[]>();
    for (const g of OPS_TIME_GROUPS) map.set(g.id, []);
    for (const item of items) {
      const list = map.get(item.time_group) ?? [];
      list.push(item);
      map.set(item.time_group, list);
    }
    return OPS_TIME_GROUPS.map((g) => ({ group: g, items: map.get(g.id) ?? [] })).filter((x) => x.items.length > 0);
  }, [items]);

  const [collapsed, setCollapsed] = useState<Record<OpsTimeGroup, boolean>>(() =>
    defaultCollapsedState(grouped),
  );

  useEffect(() => {
    setCollapsed(defaultCollapsedState(grouped));
  }, [grouped]);

  const doneCount = items.filter((i) => i.completed).length;
  const total = items.length;
  const openCount = total - doneCount;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  if (items.length === 0) {
    return <p className="text-sm text-[#6b7280]">Noch keine Aufgaben definiert.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-white">
            {doneCount} / {total} erledigt
          </span>
          <span className="text-[#9ca3af]">{openCount} offen</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#1f2937]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {grouped.map(({ group, items: groupItems }) => {
        const groupDone = groupItems.filter((i) => i.completed).length;
        const isCollapsed = collapsed[group.id] ?? false;

        return (
          <section key={group.id} className="overflow-hidden rounded-xl border border-[#1f2937] bg-[#0d1324]/80">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => ({ ...prev, [group.id]: !isCollapsed }))}
              className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[#111827]/60"
              aria-expanded={!isCollapsed}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-[#6b7280] transition-transform",
                      isCollapsed && "-rotate-90",
                    )}
                    aria-hidden
                  />
                  <h3 className="text-xs font-bold tracking-widest text-[#9ca3af]">{group.label}</h3>
                  <span className="text-[10px] text-[#6b7280]">
                    {groupDone}/{groupItems.length}
                  </span>
                </div>
                {group.hint ? <p className="mt-0.5 pl-6 text-[10px] text-[#6b7280]">{group.hint}</p> : null}
              </div>
            </button>

            {!isCollapsed ? (
              <div className="space-y-1.5 border-t border-[#1f2937] px-2 py-2">
                {groupItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
                      item.completed ? "border-emerald-500/20 bg-emerald-950/10" : "border-[#1f2937] bg-[#0a0f1e]/40",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <span
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded border",
                          item.completed
                            ? "border-[#6366f1] bg-[#6366f1] text-white"
                            : "border-[#374151] bg-transparent",
                        )}
                        aria-hidden
                      >
                        {item.completed ? <Check className="size-3" /> : null}
                      </span>
                      <div className="min-w-0">
                        <p className={cn("text-sm font-medium leading-snug", item.completed ? "text-emerald-100" : "text-white")}>
                          {item.label}
                        </p>
                        {item.time_hint ? (
                          <p className="text-[10px] italic text-[#6b7280]">{item.time_hint}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-end gap-2 pl-6 sm:pl-0">
                      {item.completed && item.staff_name ? (
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1",
                            staffBadgeStyle(item.staff_name),
                          )}
                        >
                          {firstName(item.staff_name)}
                          {formatTime(item.completed_at) ? ` · ${formatTime(item.completed_at)}` : ""}
                        </span>
                      ) : !readOnly && onComplete && staff && staff.length > 0 ? (
                        <>
                          {openAssign === item.id ? (
                            <select
                              autoFocus
                              value={staffPick[item.id] ?? ""}
                              onChange={(e) => setStaffPick((p) => ({ ...p, [item.id]: e.target.value }))}
                              className="max-w-[140px] rounded border border-[#374151] bg-[#0a0f1e] px-2 py-1 text-xs text-white"
                            >
                              <option value="">Name…</option>
                              {staff.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.full_name}
                                </option>
                              ))}
                            </select>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 px-2 text-xs"
                            disabled={savingItemId === item.id}
                            onClick={() => {
                              const staffId = staffPick[item.id];
                              if (!staffId) {
                                setOpenAssign(item.id);
                                return;
                              }
                              void onComplete(item.id, staffId).then(() => setOpenAssign(null));
                            }}
                          >
                            {savingItemId === item.id ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              "Zuweisen"
                            )}
                          </Button>
                        </>
                      ) : !item.completed && readOnly ? (
                        <span className="text-[10px] text-[#6b7280]">Offen</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
