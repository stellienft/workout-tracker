/**
 * Alarm scheduling maths. Pure — the hub client, the server actions and the
 * cron sender all share these rules, and they are unit-tested rather than
 * discovered at 6am by an alarm that didn't go off.
 */

import { formatClock, formatWhen } from "@/lib/hub/when";
import type { HubAlarm } from "@/lib/hub/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY = 86_400_000;

/**
 * When a repeating alarm should next ring, strictly after `from`, keeping the
 * original local time of day. Returns null for a one-shot alarm, which is
 * disabled once it has fired.
 */
export function nextFireAt(
  fireAt: Date,
  repeatDays: number[] | null | undefined,
  from: Date
): Date | null {
  if (!repeatDays || repeatDays.length === 0) return null;

  const candidate = new Date(from);
  candidate.setHours(fireAt.getHours(), fireAt.getMinutes(), 0, 0);
  // Walk forward at most a full week to the next enabled weekday.
  for (let i = 0; i <= 7; i++) {
    const day = new Date(candidate.getTime() + i * DAY);
    if (day.getTime() > from.getTime() && repeatDays.includes(day.getDay())) {
      return day;
    }
  }
  return null;
}

/** The instant an alarm actually rings, honouring an active snooze. */
export function effectiveFireAt(alarm: HubAlarm): Date {
  if (alarm.snoozedUntil) {
    const snoozed = new Date(alarm.snoozedUntil);
    if (!Number.isNaN(snoozed.getTime())) return snoozed;
  }
  return new Date(alarm.fireAt);
}

/** Alarms that should be ringing at `now` (within a small grace window). */
export function dueAlarms(alarms: HubAlarm[], now: Date, graceMs = 60_000): HubAlarm[] {
  return alarms.filter((a) => {
    if (!a.enabled) return false;
    const at = effectiveFireAt(a).getTime();
    return at <= now.getTime() && now.getTime() - at <= graceMs;
  });
}

/** Soonest upcoming alarm, or null when nothing is scheduled. */
export function nextAlarm(alarms: HubAlarm[], now: Date): HubAlarm | null {
  const upcoming = alarms
    .filter((a) => a.enabled && effectiveFireAt(a).getTime() > now.getTime())
    .sort((a, b) => effectiveFireAt(a).getTime() - effectiveFireAt(b).getTime());
  return upcoming[0] ?? null;
}

/** "weekdays", "Mon, Wed", "every day" — the recurrence in words. */
export function describeRepeat(repeatDays: number[] | null | undefined): string | null {
  if (!repeatDays || repeatDays.length === 0) return null;
  const sorted = [...new Set(repeatDays)].sort((a, b) => a - b);
  const key = sorted.join(",");
  if (key === "0,1,2,3,4,5,6") return "every day";
  if (key === "1,2,3,4,5") return "every weekday";
  if (key === "0,6") return "every weekend";
  return `every ${sorted.map((d) => DAY_NAMES[d]).join(", ")}`;
}

/**
 * How the hub says an alarm out loud: "tomorrow at 6:14 am", or
 * "every weekday at 6:14 am" for a repeating one.
 */
export function describeAlarm(alarm: HubAlarm, now: Date, use24h = false): string {
  const at = effectiveFireAt(alarm);
  const repeat = describeRepeat(alarm.repeatDays);
  const when = repeat
    ? `${repeat} at ${formatClock(at, use24h)}`
    : formatWhen(at, now, use24h);
  return alarm.label ? `${when} for ${alarm.label}` : when;
}

/** Spoken answer to "what alarms do I have?" */
export function describeAlarmList(alarms: HubAlarm[], now: Date, use24h = false): string {
  const upcoming = alarms
    .filter((a) => a.enabled)
    .sort((a, b) => effectiveFireAt(a).getTime() - effectiveFireAt(b).getTime());

  const timers = upcoming.filter((a) => a.kind === "timer");
  const alarmsOnly = upcoming.filter((a) => a.kind === "alarm");

  if (upcoming.length === 0) return "You have no alarms or timers set.";

  const parts: string[] = [];
  if (alarmsOnly.length > 0) {
    const list = alarmsOnly
      .slice(0, 4)
      .map((a) => describeAlarm(a, now, use24h))
      .join(", and ");
    parts.push(
      alarmsOnly.length === 1
        ? `One alarm: ${list}.`
        : `${alarmsOnly.length} alarms: ${list}.`
    );
  }
  if (timers.length > 0) {
    const soonest = timers[0];
    const remaining = Math.max(0, effectiveFireAt(soonest).getTime() - now.getTime());
    const mins = Math.ceil(remaining / 60_000);
    parts.push(
      `${timers.length === 1 ? "A timer" : `${timers.length} timers, the next`} with ${mins} minute${
        mins === 1 ? "" : "s"
      } left.`
    );
  }
  return parts.join(" ");
}
