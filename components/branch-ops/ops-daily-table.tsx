"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";

type StaffOption = { id: string; full_name: string };
type DailyItem = {
  id: string;
  label: string;
  time_hint: string | null;
  completed: boolean;
  staff_name: string | null;
  completed_at: string | null;
};

export function OpsDailyTable({
  tableId,
  token,
  workDate,
  readOnly,
  items,
  staff,
  onRefresh,
}: {
  tableId: string;
  token: string;
  workDate: string;
  readOnly?: boolean;
  items: DailyItem[];
  staff: StaffOption[];
  onRefresh: () => void;
}) {
  const [pendingItem, setPendingItem] = useState<string | null>(null);
  const [staffPick, setStaffPick] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const doneCount = items.filter((i) => i.completed).length;

  async function complete(itemId: string) {
    const staffId = staffPick[itemId];
    if (!staffId) {
      setPendingItem(itemId);
      return;
    }
    setSaving(itemId);
    try {
      const res = await fetch(`/api/ops/${token}/tables/${tableId}/daily`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily_item_id: itemId, staff_member_id: staffId, work_date: workDate }),
      });
      if (!res.ok) throw new Error("Failed");
      setPendingItem(null);
      onRefresh();
    } finally {
      setSaving(null);
    }
  }

  function formatTime(iso: string | null) {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <p className="text-xs text-[#6b7280]">
          {doneCount}/{items.length} tasks completed
          {readOnly ? " · saved for this day" : ""}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-[#6b7280]">No tasks defined. Ask your manager to add daily items.</p>
      ) : (
        items.map((item) => (
          <div
            key={item.id}
            className={`flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
              item.completed ? "border-emerald-500/30 bg-emerald-950/20" : "border-[#1f2937] bg-[#111827]"
            }`}
          >
            <div>
              <p className={`font-medium ${item.completed ? "text-emerald-200" : "text-white"}`}>
                {item.completed ? "✓ " : ""}
                {item.label}
              </p>
              {item.time_hint ? <p className="text-xs text-[#6b7280]">{item.time_hint}</p> : null}
              {item.completed && item.staff_name ? (
                <p className="text-xs text-emerald-400">
                  Done by {item.staff_name}
                  {formatTime(item.completed_at) ? ` at ${formatTime(item.completed_at)}` : ""}
                </p>
              ) : readOnly ? (
                <p className="text-xs text-[#6b7280]">Not completed</p>
              ) : null}
            </div>
            {!readOnly && !item.completed ? (
              <div className="flex flex-wrap items-center gap-2">
                {(pendingItem === item.id || !staffPick[item.id]) && (
                  <select
                    value={staffPick[item.id] ?? ""}
                    onChange={(e) => setStaffPick((p) => ({ ...p, [item.id]: e.target.value }))}
                    className="rounded-lg border border-[#1f2937] bg-[#0a0f1e] px-2 py-1.5 text-sm text-white"
                  >
                    <option value="">Your name…</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                )}
                <Button type="button" size="sm" onClick={() => void complete(item.id)} disabled={saving === item.id}>
                  {saving === item.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Done
                </Button>
              </div>
            ) : item.completed ? (
              <span className="text-emerald-400">✓</span>
            ) : (
              <span className="text-xs text-[#6b7280]">—</span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
