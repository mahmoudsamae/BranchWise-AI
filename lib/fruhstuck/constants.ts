/** Kitchen closes 18:00; orders accepted until 21:00 (Berlin time). */
export const AFTER_HOURS_START = 18;
export const AFTER_HOURS_END = 21;

export const WEEKDAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export function isAfterHoursHour(hour: number): boolean {
  return hour >= AFTER_HOURS_START && hour <= AFTER_HOURS_END;
}
