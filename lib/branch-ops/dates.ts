export function todayWorkDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isTodayWorkDate(date: string): boolean {
  return date === todayWorkDate();
}

export function shiftWorkDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatWorkDate(date: string, locale = "de-DE"): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
