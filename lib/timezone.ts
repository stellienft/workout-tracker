/**
 * Timezone helpers. The app's canonical timezone defaults to Brisbane, but
 * each member can override it (pick from a list, or match their device).
 *
 * Everything here is pure (uses only `Intl`), so the engine can stay
 * deterministic and unit-testable while still being timezone-correct: week
 * boundaries and "today" are computed against a member's zone, not the
 * server's (which is UTC on Vercel).
 */

export const DEFAULT_TZ = "Australia/Brisbane";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface ZonedParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number; // 0-23
  minute: number;
  second: number;
  weekday: number; // 0=Sun .. 6=Sat
}

/** Wall-clock parts of an instant as observed in a given IANA timezone. */
export function zonedParts(date: Date, tz: string = DEFAULT_TZ): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const map: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) map[p.type] = p.value;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: map.hour === "24" ? 0 : Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: Math.max(0, WEEKDAYS.indexOf(map.weekday)),
  };
}

/** Timezone offset from UTC in milliseconds (positive east) at `date`. */
export function zoneOffsetMs(date: Date, tz: string = DEFAULT_TZ): number {
  const p = zonedParts(date, tz);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUTC - date.getTime();
}

/** 0=Sun .. 6=Sat weekday of an instant in the given timezone. */
export function zonedWeekday(date: Date, tz: string = DEFAULT_TZ): number {
  return zonedParts(date, tz).weekday;
}

/**
 * Start of the Monday-based week containing `date`, expressed as the UTC
 * instant that reads as Monday 00:00 in `tz`.
 */
export function startOfWeekInTz(date: Date, tz: string = DEFAULT_TZ): Date {
  const p = zonedParts(date, tz);
  const daysSinceMonday = (p.weekday + 6) % 7; // Monday = 0
  const localMidnightAsUTC = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0);
  const mondayAsUTC = localMidnightAsUTC - daysSinceMonday * 86_400_000;
  return new Date(mondayAsUTC - zoneOffsetMs(date, tz));
}

/** Local calendar date ("YYYY-MM-DD") for an instant in the given timezone. */
export function todayInTz(tz: string = DEFAULT_TZ, date: Date = new Date()): string {
  const p = zonedParts(date, tz);
  const mm = String(p.month).padStart(2, "0");
  const dd = String(p.day).padStart(2, "0");
  return `${p.year}-${mm}-${dd}`;
}

/** Is `tz` a valid IANA timezone this runtime recognises? */
export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Curated timezone options for the settings picker. */
export const TIMEZONE_OPTIONS: { value: string; label: string }[] = [
  { value: "Australia/Brisbane", label: "Brisbane (AEST)" },
  { value: "Australia/Sydney", label: "Sydney / Melbourne (AEST/AEDT)" },
  { value: "Australia/Adelaide", label: "Adelaide (ACST/ACDT)" },
  { value: "Australia/Perth", label: "Perth (AWST)" },
  { value: "Australia/Darwin", label: "Darwin (ACST)" },
  { value: "Australia/Hobart", label: "Hobart (AEST/AEDT)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)" },
  { value: "Asia/Singapore", label: "Singapore (SGT)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "America/New_York", label: "New York (ET)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PT)" },
  { value: "UTC", label: "UTC" },
];
