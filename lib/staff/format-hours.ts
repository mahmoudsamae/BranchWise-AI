/** Display hours with sensible rounding (e.g. 24.666… → 24.7). */
export function formatStaffHours(n: number, decimals = 1): string {
  if (!Number.isFinite(n)) return "0";
  const rounded = Math.round(n * 10 ** decimals) / 10 ** decimals;
  return String(rounded);
}

export function roundStaffHours(n: number, decimals = 1): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
