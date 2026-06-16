"use client";

import { Check, ChevronDown, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

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
  "bg-rose-500/20 text-rose-200 ring-rose-500/30",
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

  const doneCount = items.filter((i) => i.completed).length;
  const total = items.length;
  const openCount = total - doneCount;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

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

  if (items.length === 0) {
    return <p className="text-sm text-[#6b7280]">Noch keine Aufgaben definiert.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-white">
            {doneCount} / {total} erledigt
          </span>
          <span className="text-[#9ca3af]">{openCount} offen</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#1f2937]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {grouped.map(({ group, items: groupItems }) => (
        <section key={group.id} className="space-y-3">
          <div>
            <h3 className="text-xs font-bold tracking-widest text-[#9ca3af]">{group.label}</h3>
            {group.hint ? <p className="text-[10px] text-[#6b7280]">{group.hint}</p> : null}
          </div>
          <div className="space-y-2">
            {groupItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                  item.completed ? "border-emerald-500/25 bg-emerald-950/15" : "border-[#1f2937] bg-[#0d1324]",
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
                      item.completed
                        ? "border-[#6366f1] bg-[#6366f1] text-white"
                        : "border-[#374151] bg-transparent",
                    )}
                    aria-hidden
                  >
                    {item.completed ? <Check className="size-3.5" /> : null}
                  </span>
                  <div className="min-w-0">
                    <p className={cn("font-medium", item.completed ? "text-emerald-100" : "text-white")}>{item.label}</p>
                    {item.time_hint ? <p className="text-xs italic text-[#6b7280]">{item.time_hint}</p> : null}
                    {item.completed && item.staff_name ? (
                      <p className="mt-0.5 text-xs text-emerald-400/80">
                        {formatTime(item.completed_at) ? `um ${formatTime(item.completed_at)}` : "Erledigt"}
                      </p>
                    ) : readOnly ? (
                      <p className="mt-0.5 text-xs text-[#6b7280]">Nicht erledigt</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-end gap-2 sm:pl-4">
                  {item.completed && item.staff_name ? (
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold ring-1",
                        staffBadgeStyle(item.staff_name),
                      )}
                    >
                      {firstName(item.staff_name)}
                    </span>
                  ) : !readOnly && onComplete && staff && staff.length > 0 ? (
                    <>
                      {openAssign === item.id ? (
                        <select
                          autoFocus
                          value={staffPick[item.id] ?? ""}
                          onChange={(e) => setStaffPick((p) => ({ ...p, [item.id]: e.target.value }))}
                          className="rounded-lg border border-[#374151] bg-[#0a0f1e] px-2 py-1.5 text-sm text-white"
                        >
                          <option value="">Name wählen…</option>
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
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <>
                            Zuweisen <ChevronDown className="size-3.5" />
                          </>
                        )}
                      </Button>
                    </>
                  ) : !item.completed ? (
                    <span className="text-xs text-[#6b7280]">—</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
