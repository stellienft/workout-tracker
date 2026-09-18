"use client";

/**
 * Turns a parsed intent into an action plus the sentence the hub says back.
 *
 * Split out of the hub component so the command surface is one readable switch
 * rather than a 600-line effect, and so routines (which are just lists of the
 * same actions) can reuse it step by step.
 *
 * Every branch returns something speakable, including the failures — a hub that
 * goes silent is indistinguishable from a hub that didn't hear you.
 */

import type { Intent } from "@/lib/hub/intents";
import type { HubAlarm, HubRoutine, HubSettings, RoutineStep } from "@/lib/hub/types";
import { describeAlarmList, effectiveFireAt, nextAlarm } from "@/lib/hub/alarms";
import { formatClock, formatDuration, formatWhen } from "@/lib/hub/when";
import {
  cancelAlarms,
  createAlarm,
  snoozeAlarm as snoozeAlarmAction,
} from "@/lib/actions/hub";

export interface ExecuteDeps {
  settings: HubSettings;
  routines: HubRoutine[];
  /** Latest known alarms; execute() refreshes them after any mutation. */
  alarms: HubAlarm[];
  now: () => Date;
  reloadAlarms: () => Promise<HubAlarm[]>;
  /** Speak a line immediately (used mid-routine). */
  speak: (text: string) => Promise<void>;
  /** Silence a ringing alarm. Resolves true if something was actually ringing. */
  dismissRinging: () => Promise<boolean>;
  /** The alarm currently ringing, if any — snooze targets it. */
  ringingAlarm: () => HubAlarm | null;
  refreshNowPlaying: () => Promise<{ title: string; artist: string } | null>;
  onWeather?: (glance: string) => void;
}

interface ControlResult {
  ok?: boolean;
  spoken?: string;
  needsConnect?: boolean;
  needsReconnect?: boolean;
}

async function control(body: Record<string, unknown>): Promise<ControlResult> {
  try {
    const res = await fetch("/api/spotify/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, spoken: "Spotify isn't responding." };
    return (await res.json()) as ControlResult;
  } catch {
    return { ok: false, spoken: "I couldn't reach Spotify." };
  }
}

async function weather(
  window: "now" | "today" | "tomorrow" | "week",
  place: string | null,
  deps: ExecuteDeps
): Promise<string> {
  const params = new URLSearchParams({ window });
  if (place) params.set("place", place);
  try {
    const res = await fetch(`/api/hub/weather?${params.toString()}`, { cache: "no-store" });
    const data = (await res.json()) as { spoken?: string; glance?: string };
    if (data.glance) deps.onWeather?.(data.glance);
    return data.spoken ?? "I couldn't get the weather.";
  } catch {
    return "I couldn't get the weather.";
  }
}

/** "Sure, alarm set for tomorrow at 6:14 am." */
function alarmConfirmation(at: Date, deps: ExecuteDeps, repeat: number[] | null): string {
  const { use24h } = deps.settings;
  if (repeat && repeat.length > 0) {
    const days =
      repeat.length === 7
        ? "every day"
        : repeat.join(",") === "1,2,3,4,5"
          ? "every weekday"
          : "on the days you asked for";
    return `Sure, alarm set for ${formatClock(at, use24h)}, ${days}.`;
  }
  return `Sure, alarm set for ${formatWhen(at, deps.now(), use24h)}.`;
}

async function runRoutine(routine: HubRoutine, deps: ExecuteDeps): Promise<string> {
  for (const step of routine.steps) {
    const line = await runStep(step, deps);
    if (line) await deps.speak(line);
  }
  return ""; // each step already spoke
}

async function runStep(step: RoutineStep, deps: ExecuteDeps): Promise<string> {
  switch (step.type) {
    case "speak":
      return step.text;
    case "time":
      return `It's ${formatClock(deps.now(), deps.settings.use24h)}.`;
    case "weather":
      return weather(step.window, null, deps);
    case "music": {
      if (step.volume !== undefined) {
        await control({ action: "volume", volume: step.volume });
      }
      const result = await control({ action: "play", query: step.query ?? undefined });
      return result.spoken ?? "";
    }
    case "pause_music": {
      await control({ action: "pause" });
      return "";
    }
    case "wait":
      await new Promise((resolve) => setTimeout(resolve, Math.min(step.ms, 600_000)));
      return "";
    default:
      return "";
  }
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
};

export async function executeIntent(intent: Intent, deps: ExecuteDeps): Promise<string> {
  const now = deps.now();

  switch (intent.kind) {
    case "set_alarm": {
      const at = new Date(intent.at);
      if (Number.isNaN(at.getTime())) return "I didn't catch the time for that alarm.";
      if (at.getTime() <= now.getTime()) return "That time has already passed.";
      const result = await createAlarm({
        at: at.toISOString(),
        kind: "alarm",
        label: intent.label,
        repeatDays: intent.repeat,
      });
      if (!result.ok) return "I couldn't save that alarm.";
      await deps.reloadAlarms();
      return alarmConfirmation(at, deps, intent.repeat);
    }

    case "set_timer": {
      const at = new Date(now.getTime() + intent.ms);
      const result = await createAlarm({
        at: at.toISOString(),
        kind: "timer",
        label: intent.label,
      });
      if (!result.ok) return "I couldn't start that timer.";
      await deps.reloadAlarms();
      return `Timer set for ${formatDuration(intent.ms)}.`;
    }

    case "cancel": {
      const result = await cancelAlarms(intent.target);
      await deps.reloadAlarms();
      if (!result.ok) return "I couldn't cancel those.";
      if (result.count === 0) return "There was nothing to cancel.";
      const noun = intent.target === "timers" ? "timer" : "alarm";
      return `Cancelled ${result.count} ${noun}${result.count === 1 ? "" : "s"}.`;
    }

    case "list_alarms":
      return describeAlarmList(deps.alarms, now, deps.settings.use24h);

    case "stop": {
      const wasRinging = await deps.dismissRinging();
      return wasRinging ? "" : "Okay.";
    }

    case "snooze": {
      const ringing = deps.ringingAlarm();
      if (!ringing) return "Nothing is ringing.";
      const result = await snoozeAlarmAction(ringing.id, intent.ms);
      await deps.dismissRinging();
      await deps.reloadAlarms();
      if (!result.ok) return "I couldn't snooze that.";
      return `Snoozed for ${formatDuration(intent.ms)}.`;
    }

    case "weather":
      return weather(intent.window, intent.place, deps);

    case "music_play": {
      const result = await control({ action: "play", query: intent.query ?? undefined });
      return result.spoken ?? "";
    }

    case "music_control": {
      const result = await control({ action: intent.action });
      return result.spoken ?? "";
    }

    case "music_volume": {
      const result = await control({
        action: "volume",
        ...(intent.level !== null ? { volume: intent.level } : { direction: intent.direction }),
      });
      return result.spoken ?? "";
    }

    case "now_playing": {
      const track = await deps.refreshNowPlaying();
      if (!track) return "Nothing is playing right now.";
      return `This is ${track.title}${track.artist ? ` by ${track.artist}` : ""}.`;
    }

    case "time":
      return `It's ${formatClock(now, deps.settings.use24h)}.`;

    case "date":
      return `Today is ${now.toLocaleDateString("en-AU", DATE_FORMAT)}.`;

    case "routine": {
      const routine = deps.routines.find((r) => r.slug === intent.slug);
      if (!routine) return "I don't know that routine.";
      return runRoutine(routine, deps);
    }

    case "greeting": {
      const name = deps.settings.displayName;
      const next = nextAlarm(deps.alarms, now);
      const suffix = next
        ? ` Your next alarm is ${formatWhen(effectiveFireAt(next), now, deps.settings.use24h)}.`
        : "";
      return `Hello${name ? `, ${name}` : ""}.${suffix}`;
    }

    case "answer":
      return intent.text;

    case "unknown":
      return "Sorry, I didn't catch that.";

    default:
      return "Sorry, I didn't catch that.";
  }
}

/** Exported for the routines panel's "run now" button. */
export async function runRoutineNow(routine: HubRoutine, deps: ExecuteDeps): Promise<void> {
  await runRoutine(routine, deps);
}
