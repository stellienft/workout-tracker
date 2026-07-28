/**
 * Workout streak from completed-session timestamps. A streak is the run of
 * consecutive calendar days (in the member's timezone) with at least one
 * completed workout, counting back from today — or from yesterday if they
 * haven't trained yet today, in which case the streak is still "alive" but at
 * risk of breaking if they don't train before the day ends.
 */

function localDate(iso: string | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function addDays(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

export interface StreakInfo {
  current: number; // consecutive days, including a still-alive streak from yesterday
  trainedToday: boolean;
  atRisk: boolean; // streak > 0 but nothing logged today yet
}

export function computeStreak(
  completedAt: (string | Date)[],
  tz: string,
  now: Date = new Date()
): StreakInfo {
  const days = new Set(completedAt.map((d) => localDate(d, tz)));
  const today = localDate(now, tz);
  const yesterday = addDays(today, -1);

  const trainedToday = days.has(today);
  // Anchor the walk at whichever recent day has a session.
  let cursor = trainedToday ? today : days.has(yesterday) ? yesterday : null;
  if (!cursor) return { current: 0, trainedToday: false, atRisk: false };

  let current = 0;
  while (days.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, trainedToday, atRisk: current > 0 && !trainedToday };
}
