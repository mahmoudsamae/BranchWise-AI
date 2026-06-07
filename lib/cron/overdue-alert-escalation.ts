export type OverdueRecipientRole = "general_manager" | "branch_manager" | "super_admin";

export function daysOverdueFromDueDate(dueDate: string, today: string): number {
  return Math.floor((Date.parse(today) - Date.parse(dueDate)) / 86400000);
}

/** Roles to notify on this calendar day of being overdue. */
export function recipientRolesForDaysOverdue(daysOverdue: number): OverdueRecipientRole[] {
  if (daysOverdue <= 1) return [];
  if (daysOverdue === 2) return ["general_manager"];
  if (daysOverdue === 3) return ["general_manager", "branch_manager"];
  if (daysOverdue >= 5) return ["super_admin"];
  return [];
}

export function logKey(requestId: string, role: OverdueRecipientRole): string {
  return `${requestId}:${role}`;
}

export function shouldSkipSuperAdminAlert(lastSentAt: string | null, today: string): boolean {
  if (!lastSentAt) return false;
  const lastDay = lastSentAt.slice(0, 10);
  const daysSince = Math.floor((Date.parse(today) - Date.parse(lastDay)) / 86400000);
  return daysSince < 3;
}
