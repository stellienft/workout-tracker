/**
 * Voice intent parser for the home hub.
 *
 * Deterministic and pure: a transcript in, a structured intent out. This runs
 * first on every utterance because it is instant and works with no network —
 * only what it cannot classify falls through to the LLM interpreter in
 * /api/hub/interpret, which returns intents in this same shape.
 *
 * Keeping it pure means the whole command surface is unit-tested without a
 * microphone, a browser, or a network round trip.
 */

import { normalise, parseDuration, parseWhen } from "@/lib/hub/when";

export type WeatherWindow = "now" | "today" | "tomorrow" | "week";

export type Intent =
  | { kind: "set_alarm"; at: string; label: string | null; repeat: number[] | null }
  | { kind: "set_timer"; ms: number; label: string | null }
  | { kind: "cancel"; target: "alarms" | "timers" | "all" }
  | { kind: "list_alarms" }
  | { kind: "stop" }
  | { kind: "snooze"; ms: number }
  | { kind: "weather"; window: WeatherWindow; place: string | null }
  | { kind: "music_play"; query: string | null }
  | { kind: "music_control"; action: "pause" | "resume" | "next" | "previous" }
  | { kind: "music_volume"; level: number | null; direction: "up" | "down" | null }
  | { kind: "now_playing" }
  | { kind: "time" }
  | { kind: "date" }
  | { kind: "routine"; slug: string }
  | { kind: "greeting" }
  /** A spoken reply produced by the LLM fallback, not by the local parser. */
  | { kind: "answer"; text: string }
  | { kind: "unknown"; text: string };

export interface RoutineTrigger {
  slug: string;
  phrase: string;
}

export interface ParseContext {
  now: Date;
  routines?: RoutineTrigger[];
}

/** Default wake word. Configurable per hub in settings. */
export const DEFAULT_WAKE_WORD = "hey stellio";

/**
 * Levenshtein edit distance, bounded by `max` so a long transcript token exits
 * early instead of filling a full DP table.
 */
export function editDistance(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1, // deletion
        current[j - 1] + 1, // insertion
        previous[j - 1] + cost // substitution
      );
      if (current[j] < best) best = current[j];
    }
    if (best > max) return max + 1; // no path can get back under the bound
    previous = current;
  }
  return previous[b.length];
}

/** How far off a heard word may be and still count as the wake word. */
function wakeTolerance(name: string): number {
  return Math.min(2, Math.floor(name.length / 3));
}

/** The distinctive part of a wake word — "stellio" out of "hey stellio". */
function wakeName(wakeWord: string): string {
  const words = normalise(wakeWord).split(" ").filter(Boolean);
  return words[words.length - 1] ?? "";
}

/**
 * Index of the token that matched the wake word, or -1.
 *
 * Speech recognisers mangle invented names constantly — "stelio", "stellium",
 * "stellio's" — so this is a fuzzy match rather than an equality check. An
 * occasional false wake costs a second of listening; a missed wake makes the
 * whole device feel broken, so the tolerance leans permissive.
 */
function wakeIndex(transcript: string, wakeWord: string): number {
  const name = wakeName(wakeWord);
  if (!name) return -1;
  const tolerance = wakeTolerance(name);
  const tokens = normalise(transcript).split(" ").filter(Boolean);

  return tokens.findIndex((token) => {
    const word = token.replace(/[^a-z0-9]/g, "");
    if (!word) return false;
    // Guard the cheap case first: a clean prefix/suffix match ("stellios").
    if (word.startsWith(name) || name.startsWith(word)) {
      return Math.abs(word.length - name.length) <= tolerance;
    }
    return editDistance(word, name, tolerance) <= tolerance;
  });
}

/** True when the transcript contains the wake word. */
export function matchesWake(transcript: string, wakeWord: string): boolean {
  return wakeIndex(transcript, wakeWord) !== -1;
}

/**
 * Everything the user said after the wake word, so "hey stellio what's the
 * weather" parses as "what's the weather". Returns the transcript unchanged
 * when no wake word is present (push-to-talk speech).
 */
export function stripWake(transcript: string, wakeWord: string): string {
  const tokens = normalise(transcript).split(" ").filter(Boolean);
  const index = wakeIndex(transcript, wakeWord);
  if (index === -1) return tokens.join(" ");
  return tokens.slice(index + 1).join(" ").trim();
}

const SNOOZE_DEFAULT_MS = 9 * 60_000;

const REPEAT_DAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

/**
 * Day-of-week recurrence for an alarm, 0 = Sunday. Null for a one-shot.
 * "every weekday", "every day", "every monday and wednesday", "on weekends".
 */
export function parseRepeat(text: string): number[] | null {
  if (/\bevery ?day\b|\bdaily\b|\beach day\b/.test(text)) return [0, 1, 2, 3, 4, 5, 6];
  if (/\bweekdays?\b|\bwork days?\b|\bduring the week\b/.test(text)) return [1, 2, 3, 4, 5];
  if (/\bweekends?\b/.test(text)) return [0, 6];

  if (/\bevery\b/.test(text)) {
    const days = Object.entries(REPEAT_DAYS)
      .filter(([name]) => new RegExp(`\\b${name}s?\\b`).test(text))
      .map(([, index]) => index);
    if (days.length > 0) return days.sort((a, b) => a - b);
  }
  return null;
}

function labelFrom(text: string): string | null {
  const m = text.match(/\b(?:called|named|labell?ed)\s+(.+)$/);
  if (m) return m[1].trim() || null;
  // "set an alarm for 6am to take my meds"
  const purpose = text.match(/\b(?:to|for)\s+((?:take|call|check|start|go|get|leave|water|meet)\b.+)$/);
  return purpose ? purpose[1].trim() : null;
}

function weatherWindow(text: string): WeatherWindow {
  if (/\btomorrow\b/.test(text)) return "tomorrow";
  if (/\b(week|next few days|coming days|forecast for the week)\b/.test(text)) return "week";
  if (/\b(today|rest of the day|this afternoon|tonight|later)\b/.test(text)) return "today";
  return "now";
}

function placeFrom(text: string): string | null {
  const m = text.match(/\b(?:in|for|at)\s+([a-z][a-z\s'-]{2,40})$/);
  if (!m) return null;
  const place = m[1].trim();
  // Guard against swallowing time words as place names.
  if (/^(the|today|tomorrow|now|here|a week|the week|this week)\b/.test(place)) return null;
  return place;
}

/** Strip the filler that wraps a music request: "play some jazz on spotify". */
function musicQuery(rest: string): string | null {
  const query = rest
    .replace(/\bon\s+spotify\b/g, " ")
    .replace(/\b(please|for me|in here|in the (kitchen|lounge|room))\b/g, " ")
    .replace(/^\s*(some|a bit of|a little)\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!query || /^(music|something|anything|a song|songs|tunes)$/.test(query)) return null;
  return query;
}

/**
 * Classify an utterance. Order matters: the most specific and most
 * safety-critical commands (stop, cancel) are matched before the open-ended
 * ones (music, which would otherwise swallow "stop playing").
 */
export function parseIntent(input: string, ctx: ParseContext): Intent {
  const text = normalise(input);
  if (!text) return { kind: "unknown", text: "" };

  // --- Custom routines win: the user named these phrases themselves. ---
  for (const routine of ctx.routines ?? []) {
    const phrase = normalise(routine.phrase);
    if (phrase && (text === phrase || text.startsWith(`${phrase} `))) {
      return { kind: "routine", slug: routine.slug };
    }
  }

  // --- Stop / snooze / cancel ---
  if (/\b(snooze|5 more minutes|few more minutes|a bit longer)\b/.test(text)) {
    const ms = parseDuration(text);
    return { kind: "snooze", ms: ms ?? SNOOZE_DEFAULT_MS };
  }
  if (/^(stop|quiet|shush|shut up|be quiet|silence|dismiss|that's enough|thank you|thanks|nevermind|never mind)\b/.test(text)) {
    // "stop the music" is a playback command, not a dismiss.
    if (/\b(music|song|track|playing|spotify|playback)\b/.test(text)) {
      return { kind: "music_control", action: "pause" };
    }
    return { kind: "stop" };
  }
  if (/\b(cancel|delete|remove|clear|turn off)\b.*\b(alarm|alarms)\b/.test(text)) {
    return { kind: "cancel", target: "alarms" };
  }
  if (/\b(cancel|delete|remove|clear|stop)\b.*\b(timer|timers)\b/.test(text)) {
    return { kind: "cancel", target: "timers" };
  }

  // --- Alarms and timers ---
  if (/\b(timer|countdown)\b/.test(text)) {
    const ms = parseDuration(text);
    if (ms) return { kind: "set_timer", ms, label: labelFrom(text) };
  }
  if (/\b(alarm|wake me|wake up|remind me|reminder)\b/.test(text)) {
    const when = parseWhen(text, ctx.now);
    if (when) {
      return {
        kind: "set_alarm",
        at: when.at.toISOString(),
        label: labelFrom(text),
        repeat: parseRepeat(text),
      };
    }
  }
  if (/\b(what|which|any|list|show).*(alarms?|timers?)\b/.test(text)) {
    return { kind: "list_alarms" };
  }
  // Bare "set a timer for 10 minutes" where the word order hid the keyword.
  if (/^set\b/.test(text)) {
    const ms = parseDuration(text);
    if (ms && !/\balarm\b/.test(text)) {
      return { kind: "set_timer", ms, label: labelFrom(text) };
    }
    const when = parseWhen(text, ctx.now);
    if (when) {
      return {
        kind: "set_alarm",
        at: when.at.toISOString(),
        label: labelFrom(text),
        repeat: parseRepeat(text),
      };
    }
  }

  // --- Weather ---
  if (/\b(weather|forecast|rain|raining|temperature|hot|cold|sunny|umbrella|windy|humid)\b/.test(text)) {
    return { kind: "weather", window: weatherWindow(text), place: placeFrom(text) };
  }

  // --- Music ---
  if (/\b(what('s| is) (this|playing)|what song|who('s| is) this|now playing)\b/.test(text)) {
    return { kind: "now_playing" };
  }
  if (/\b(volume|louder|quieter|turn it (up|down)|turn (up|down))\b/.test(text)) {
    const level = text.match(/\b(?:volume|to)\s*(?:to\s*)?(\d{1,3})\s*(?:percent|%)?\b/);
    if (level) {
      const value = parseInt(level[1], 10);
      if (value >= 0 && value <= 100) return { kind: "music_volume", level: value, direction: null };
    }
    const direction = /\b(up|louder|higher|increase)\b/.test(text) ? "up" : "down";
    return { kind: "music_volume", level: null, direction };
  }
  if (/\b(skip|next (song|track))\b/.test(text)) {
    return { kind: "music_control", action: "next" };
  }
  if (/\b(previous|go back|last song|previous track)\b/.test(text)) {
    return { kind: "music_control", action: "previous" };
  }
  if (/\b(pause|stop)\b.*\b(music|song|track|spotify|playback|playing)\b/.test(text) || /^pause$/.test(text)) {
    return { kind: "music_control", action: "pause" };
  }
  if (/\b(resume|unpause|continue|keep playing)\b/.test(text)) {
    return { kind: "music_control", action: "resume" };
  }
  const play = text.match(/^(?:play|put on|start playing|start)\s+(.*)$/);
  if (play) {
    return { kind: "music_play", query: musicQuery(play[1]) };
  }
  if (/^(play|music|some music)$/.test(text)) {
    return { kind: "music_play", query: null };
  }

  // --- Clock ---
  if (/\b(what('s| is)? the time|what time is it|time is it)\b/.test(text)) {
    return { kind: "time" };
  }
  if (/\b(what('s| is)? (the|today's) date|what day is it|what's today)\b/.test(text)) {
    return { kind: "date" };
  }

  // --- Social ---
  if (/^(hello|hi|hey|good morning|good afternoon|good evening|how are you)\b/.test(text)) {
    return { kind: "greeting" };
  }

  return { kind: "unknown", text };
}
