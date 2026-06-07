import { DAY_OF_WEEK_LABELS } from "@/lib/schedules/dates";

import type { ScheduledExportType } from "./generate-pdf";

export const EXPORT_TYPE_LABELS: Record<ScheduledExportType, string> = {
  weekly: "Weekly PDF",
  management: "Management PDF",
  comparison: "Comparison PDF",
};

export function formatHourUtc(hourUtc: number): string {
  return `${String(hourUtc).padStart(2, "0")}:00`;
}

export function formatDeliveryScheduleCard(
  exportType: string,
  dayOfWeek: number,
  hourUtc: number,
  isActive: boolean,
): string {
  const day = DAY_OF_WEEK_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`;
  const typeLabel = EXPORT_TYPE_LABELS[exportType as ScheduledExportType] ?? exportType;
  return `${typeLabel} — Every ${day} ${formatHourUtc(hourUtc)} UTC — ${isActive ? "Active" : "Paused"}`;
}
