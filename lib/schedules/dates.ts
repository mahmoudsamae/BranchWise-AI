export const DAY_OF_WEEK_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayUtc(): string {
  return isoDate(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

/** Next date on or after fromIso matching dayOfWeek (0=Sun … 6=Sat). */
export function nextRunOnOrAfter(fromIso: string, dayOfWeek: number): string {
  const start = new Date(`${fromIso}T00:00:00.000Z`);
  for (let offset = 0; offset <= 7; offset += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + offset);
    if (d.getUTCDay() === dayOfWeek) return isoDate(d);
  }
  return fromIso;
}

/** Next occurrence strictly after runDateIso. */
export function nextRunAfter(runDateIso: string, dayOfWeek: number): string {
  return nextRunOnOrAfter(addDays(runDateIso, 1), dayOfWeek);
}

export function formatScheduleDay(dayOfWeek: number): string {
  return DAY_OF_WEEK_LABELS[dayOfWeek] ?? `Day ${dayOfWeek}`;
}

export function formatDisplayDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00.000Z`));
  } catch {
    return iso;
  }
}
