export const DOCUMENT_ALERT_DAYS = [30, 14, 7, 1] as const;

export type DocumentAlertTier = (typeof DOCUMENT_ALERT_DAYS)[number];

export function daysUntilExpiry(expiresAt: string, today: string): number {
  return Math.floor((Date.parse(expiresAt) - Date.parse(today)) / 86400000);
}

export function alertTierForDaysLeft(daysLeft: number): DocumentAlertTier | null {
  if (daysLeft < 0) return null;
  return DOCUMENT_ALERT_DAYS.find((d) => d === daysLeft) ?? null;
}
