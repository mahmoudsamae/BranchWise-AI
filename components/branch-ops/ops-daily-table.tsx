"use client";

import { useState } from "react";

import { OpsDailyTaskList, type OpsDailyTaskItem } from "@/components/branch-ops/ops-daily-task-list";

type StaffOption = { id: string; full_name: string };

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
  items: OpsDailyTaskItem[];
  staff: StaffOption[];
  onRefresh: () => void;
}) {
  const [savingItemId, setSavingItemId] = useState<string | null>(null);

  async function complete(itemId: string, staffId: string) {
    setSavingItemId(itemId);
    try {
      const res = await fetch(`/api/ops/${token}/tables/${tableId}/daily`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daily_item_id: itemId, staff_member_id: staffId, work_date: workDate }),
      });
      if (!res.ok) throw new Error("Failed");
      onRefresh();
    } finally {
      setSavingItemId(null);
    }
  }

  return (
    <OpsDailyTaskList
      items={items}
      staff={staff}
      readOnly={readOnly}
      savingItemId={savingItemId}
      onComplete={readOnly ? undefined : complete}
    />
  );
}
