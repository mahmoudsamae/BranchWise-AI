/** Date-only strings (YYYY-MM-DD) compared in UTC calendar day. */
export function urgencyForDueDate(dueDate: string): "overdue" | "today" | "upcoming" {
  const today = new Date();
  const y = today.getUTCFullYear();
  const m = String(today.getUTCMonth() + 1).padStart(2, "0");
  const d = String(today.getUTCDate()).padStart(2, "0");
  const todayStr = `${y}-${m}-${d}`;

  if (dueDate < todayStr) return "overdue";
  if (dueDate === todayStr) return "today";
  return "upcoming";
}

export function daysUntilDue(dueDate: string): number {
  const due = new Date(`${dueDate}T00:00:00.000Z`).getTime();
  const today = new Date();
  const t = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.ceil((due - t) / (24 * 60 * 60 * 1000));
}
