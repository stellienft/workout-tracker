/**
 * Stellio Fit program engine.
 *
 * Pure functions that resolve "what should this user do next" for any
 * program, regardless of scheduling mode. The 12-week beginner program is
 * just one configuration of this engine — nothing here is specific to it.
 *
 * Scheduling modes:
 *  - sequential:   workouts with a `sequence_order` form a repeating
 *                  rotation (A, B, A, B, ...). The enrolment's
 *                  `next_workout_sequence` (1-based) points at the next
 *                  rotation slot. Missed days never break the rotation —
 *                  time doesn't advance the pointer, completions do.
 *  - weekly_split: workouts with a `week_position` belong to fixed slots
 *                  in the training week; the next workout is the first
 *                  position not yet completed this week.
 *  - calendar:     workouts are pinned to weekdays via `day_of_week`.
 */

export interface EngineTemplate {
  id: string;
  name: string;
  sequence_order: number | null;
  week_position: number | null;
  day_of_week: number | null;
  is_optional: boolean;
}

export interface EngineEnrolment {
  current_week: number;
  next_workout_sequence: number;
  selected_days_per_week: number;
  start_date: string; // ISO date
}

export interface EngineSession {
  workout_template_id: string | null;
  status: string;
  completed_at: string | null; // ISO timestamp
  week_number: number | null;
}

export type SchedulingMode = "sequential" | "weekly_split" | "calendar";

/** Required (non-optional) rotation for sequential programs, in order. */
export function sequentialRotation(templates: EngineTemplate[]): EngineTemplate[] {
  return templates
    .filter((t) => !t.is_optional && t.sequence_order != null)
    .sort((a, b) => (a.sequence_order! - b.sequence_order!));
}

/** Ordered slots for weekly-split programs. */
export function weeklySlots(templates: EngineTemplate[]): EngineTemplate[] {
  return templates
    .filter((t) => t.week_position != null)
    .sort((a, b) => a.week_position! - b.week_position!);
}

/**
 * Resolve the next workout for a sequential enrolment.
 * `next_workout_sequence` is 1-based and simply wraps around the rotation,
 * so missed sessions never skip or break anything.
 */
export function nextSequentialWorkout(
  templates: EngineTemplate[],
  enrolment: Pick<EngineEnrolment, "next_workout_sequence">
): EngineTemplate | null {
  const rotation = sequentialRotation(templates);
  if (rotation.length === 0) return null;
  const idx = (enrolment.next_workout_sequence - 1) % rotation.length;
  return rotation[((idx % rotation.length) + rotation.length) % rotation.length];
}

/** Sessions completed within the week containing `now` (Monday-start). */
export function completedThisWeek(
  sessions: EngineSession[],
  now: Date
): EngineSession[] {
  const start = startOfWeek(now);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return sessions.filter((s) => {
    if (s.status !== "completed" || !s.completed_at) return false;
    const t = new Date(s.completed_at);
    return t >= start && t < end;
  });
}

/**
 * Resolve the next workout for a weekly-split enrolment: the first slot
 * whose template hasn't been completed this week. Completing days out of
 * order (or missing a day) just moves you to the earliest incomplete slot.
 */
export function nextWeeklySplitWorkout(
  templates: EngineTemplate[],
  sessions: EngineSession[],
  now: Date
): EngineTemplate | null {
  const slots = weeklySlots(templates);
  if (slots.length === 0) return null;
  const doneIds = new Set(
    completedThisWeek(sessions, now).map((s) => s.workout_template_id)
  );
  return slots.find((t) => !doneIds.has(t.id)) ?? null;
}

/** Resolve today's (or the next upcoming) workout for a calendar program. */
export function nextCalendarWorkout(
  templates: EngineTemplate[],
  sessions: EngineSession[],
  now: Date
): EngineTemplate | null {
  const scheduled = templates.filter((t) => t.day_of_week != null);
  if (scheduled.length === 0) return null;
  const doneIds = new Set(
    completedThisWeek(sessions, now).map((s) => s.workout_template_id)
  );
  const today = now.getDay();
  // Order by distance from today (today first), skip completed.
  const ordered = [...scheduled].sort(
    (a, b) =>
      ((a.day_of_week! - today + 7) % 7) - ((b.day_of_week! - today + 7) % 7)
  );
  return ordered.find((t) => !doneIds.has(t.id)) ?? null;
}

export function nextWorkout(
  mode: SchedulingMode,
  templates: EngineTemplate[],
  enrolment: EngineEnrolment,
  sessions: EngineSession[],
  now: Date
): EngineTemplate | null {
  switch (mode) {
    case "sequential":
      return nextSequentialWorkout(templates, enrolment);
    case "weekly_split":
      return nextWeeklySplitWorkout(templates, sessions, now);
    case "calendar":
      return nextCalendarWorkout(templates, sessions, now);
  }
}

/**
 * State transition after completing a workout: advance the sequential
 * pointer (only when a required rotation workout was completed) and
 * advance `current_week` when the weekly target is met.
 */
export function advanceAfterCompletion(
  mode: SchedulingMode,
  templates: EngineTemplate[],
  enrolment: EngineEnrolment,
  completedTemplateId: string,
  sessionsThisWeekIncludingThis: number,
  durationWeeks: number
): { next_workout_sequence: number; current_week: number } {
  let seq = enrolment.next_workout_sequence;

  if (mode === "sequential") {
    const rotation = sequentialRotation(templates);
    const isRequired = rotation.some((t) => t.id === completedTemplateId);
    if (isRequired) seq = seq + 1;
  }

  const weeklyTarget = weeklyTargetFor(mode, templates, enrolment);
  let week = enrolment.current_week;
  if (weeklyTarget > 0 && sessionsThisWeekIncludingThis >= weeklyTarget) {
    week = Math.min(week + 1, durationWeeks);
  }

  return { next_workout_sequence: seq, current_week: week };
}

/** How many required workouts make up a complete week. */
export function weeklyTargetFor(
  mode: SchedulingMode,
  templates: EngineTemplate[],
  enrolment: Pick<EngineEnrolment, "selected_days_per_week">
): number {
  if (mode === "weekly_split") return weeklySlots(templates).length;
  if (mode === "calendar")
    return templates.filter((t) => t.day_of_week != null).length;
  return enrolment.selected_days_per_week;
}

export interface WeeklyProgress {
  target: number;
  completed: number;
  remaining: number;
  percent: number;
}

export function weeklyProgress(
  mode: SchedulingMode,
  templates: EngineTemplate[],
  enrolment: EngineEnrolment,
  sessions: EngineSession[],
  now: Date
): WeeklyProgress {
  const target = weeklyTargetFor(mode, templates, enrolment);
  const done = completedThisWeek(sessions, now).length;
  const completed = Math.min(done, Math.max(target, done));
  const remaining = Math.max(target - done, 0);
  const percent = target === 0 ? 0 : Math.min(Math.round((done / target) * 100), 100);
  return { target, completed, remaining, percent };
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}
