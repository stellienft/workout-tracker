/**
 * Natural-language time parsing for the voice hub.
 *
 * Pure functions — no IO, no `Date.now()` — so every branch is unit-testable and
 * the caller controls "now". Everything works in the *local* time of the `now`
 * Date it is given, which on the hub tablet is the tablet's own clock.
 *
 * Handles the shapes people actually say to a speaker:
 *   "in 20 minutes", "in an hour and a half"
 *   "at 6:14am", "for six fourteen", "at half past six", "at 6 o'clock"
 *   "tomorrow at 6:30", "tonight at 9", "on monday at 7", "at noon"
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Digits for the number words a speech recogniser is likely to hand back. */
const UNITS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18,
  nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fourty: 40, fifty: 50,
};

const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6,
  sun: 0, mon: 1, tue: 2, tues: 2, wed: 3, thu: 4, thurs: 4, fri: 5, sat: 6,
};

/**
 * Replace spoken number words with digits, folding "twenty five" into 25 while
 * leaving "six thirty" as two tokens ("6 30") so it can still read as a time.
 */
export function digitise(input: string): string {
  const tokens = input.split(/\s+/);
  const out: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const word = tokens[i].replace(/[^a-z0-9:.']/g, "");
    if (word in TENS) {
      const next = tokens[i + 1]?.replace(/[^a-z]/g, "") ?? "";
      // "twenty five" -> 25, but "thirty minutes" stays 30.
      if (next in UNITS && UNITS[next] >= 1 && UNITS[next] <= 9) {
        out.push(String(TENS[word] + UNITS[next]));
        i++;
        continue;
      }
      out.push(String(TENS[word]));
      continue;
    }
    if (word in UNITS) {
      out.push(String(UNITS[word]));
      continue;
    }
    out.push(tokens[i]);
  }
  return out.join(" ");
}

/** Lowercase, strip filler punctuation, and turn number words into digits. */
export function normalise(input: string): string {
  return digitise(
    input
      .toLowerCase()
      .replace(/[,!?]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  )
    .replace(/\s+/g, " ")
    .trim();
}

// ---------- Durations ----------

const DURATION_UNITS: Array<[RegExp, number]> = [
  [/^(h|hr|hrs|hour|hours)$/, HOUR],
  [/^(m|min|mins|minute|minutes)$/, MIN],
  [/^(s|sec|secs|second|seconds)$/, 1000],
];

/**
 * Parse a spoken duration into milliseconds. Returns null when the text has no
 * duration in it. Sums every part it finds: "1 hour 30 minutes" -> 5_400_000.
 */
export function parseDuration(input: string): number | null {
  const text = normalise(input)
    // "an hour" / "a minute" read as 1, and "half an hour" as 30 minutes.
    .replace(/\bhalf an hour\b/g, "30 minutes")
    .replace(/\bhalf a minute\b/g, "30 seconds")
    .replace(/\ban? (hour|minute|second)\b/g, "1 $1");

  let total = 0;
  let found = false;
  const re = /(\d+(?:\.\d+)?)\s*([a-z]+)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text))) {
    const value = parseFloat(m[1]);
    const unit = m[2];
    for (const [pattern, ms] of DURATION_UNITS) {
      if (pattern.test(unit)) {
        total += value * ms;
        found = true;
        break;
      }
    }
  }
  // "an hour and a half" — the trailing half applies to the last unit seen.
  if (found && /\band a half\b/.test(text)) {
    total += /\bhours?\b/.test(text) ? HOUR / 2 : MIN / 2;
  }
  return found && total > 0 ? Math.round(total) : null;
}

// ---------- Clock times ----------

interface Clock {
  hour: number; // 0-23 once resolved, or 1-12 when the meridiem is unknown
  minute: number;
  meridiem: "am" | "pm" | null;
}

function clockFrom(text: string): Clock | null {
  if (/\b(midday|noon)\b/.test(text)) return { hour: 12, minute: 0, meridiem: "pm" };
  if (/\bmidnight\b/.test(text)) return { hour: 0, minute: 0, meridiem: "am" };

  // "quarter past six", "half past 6", "quarter to seven", "10 past 6"
  const past = text.match(
    /\b(quarter|half|\d{1,2})\s+(past|to|after)\s+(\d{1,2})\b/
  );
  if (past) {
    const amount =
      past[1] === "quarter" ? 15 : past[1] === "half" ? 30 : parseInt(past[1], 10);
    const base = parseInt(past[3], 10);
    if (base >= 1 && base <= 12 && amount >= 1 && amount <= 59) {
      const toward = past[2] === "to";
      const hour = toward ? (base === 1 ? 12 : base - 1) : base;
      const minute = toward ? 60 - amount : amount;
      return { hour, minute, meridiem: meridiemIn(text) };
    }
  }

  // "6:14 am", "06.14", "18:05"
  const colon = text.match(/\b(\d{1,2})[:.](\d{2})\s*(a\.?m\.?|p\.?m\.?)?/);
  if (colon) {
    const hour = parseInt(colon[1], 10);
    const minute = parseInt(colon[2], 10);
    if (hour <= 23 && minute <= 59) {
      return { hour, minute, meridiem: meridiemOf(colon[3]) ?? meridiemIn(text) };
    }
  }

  // "6 30 am" — what "six thirty" becomes after digitise().
  const spaced = text.match(/\b(\d{1,2})\s+(\d{2})\s*(a\.?m\.?|p\.?m\.?)?\b/);
  if (spaced) {
    const hour = parseInt(spaced[1], 10);
    const minute = parseInt(spaced[2], 10);
    if (hour <= 23 && minute <= 59) {
      return { hour, minute, meridiem: meridiemOf(spaced[3]) ?? meridiemIn(text) };
    }
  }

  // "at 6am", "for 7", "6 o'clock"
  const bare = text.match(
    /\b(?:at|for|by|around|about)?\s*(\d{1,2})\s*(a\.?m\.?|p\.?m\.?|o'?clock)?\b/
  );
  if (bare) {
    const hour = parseInt(bare[1], 10);
    if (hour <= 23) {
      const tag = bare[2];
      const meridiem =
        tag && /o'?clock/.test(tag) ? meridiemIn(text) : meridiemOf(tag) ?? meridiemIn(text);
      return { hour, minute: 0, meridiem };
    }
  }
  return null;
}

function meridiemOf(tag: string | undefined): "am" | "pm" | null {
  if (!tag) return null;
  if (/^a/.test(tag)) return "am";
  if (/^p/.test(tag)) return "pm";
  return null;
}

/** Meridiem implied by words elsewhere in the sentence ("tonight", "morning"). */
function meridiemIn(text: string): "am" | "pm" | null {
  if (/\b(a\.?m\.?|morning)\b/.test(text)) return "am";
  if (/\b(p\.?m\.?|afternoon|evening|tonight|night)\b/.test(text)) return "pm";
  return null;
}

// ---------- Parsing ----------

export interface ParsedWhen {
  /** Absolute instant the phrase resolves to. */
  at: Date;
  /** True when the phrase was relative ("in 10 minutes"). */
  relative: boolean;
  /** True when no meridiem was stated and the next matching slot was chosen. */
  assumedMeridiem: boolean;
}

/**
 * Resolve a spoken time phrase to an instant.
 *
 * Ambiguity rules, chosen to match what a bedside speaker should do:
 *  - no meridiem given -> the *soonest* future match of the two 12-hour slots,
 *    so "set an alarm for 6" said at 10pm means 6am.
 *  - a stated time already past today -> tomorrow.
 *  - "tomorrow"/weekday names pin the date, and the time is taken literally.
 */
export function parseWhen(input: string, now: Date): ParsedWhen | null {
  const text = normalise(input);

  // Relative first: "in 20 minutes" never means a clock time.
  const relative = text.match(/\bin\s+(.+)$/);
  if (relative) {
    const ms = parseDuration(relative[1]);
    if (ms) {
      return { at: new Date(now.getTime() + ms), relative: true, assumedMeridiem: false };
    }
  }

  const clock = clockFrom(text);
  if (!clock) return null;

  let dayOffset = 0;
  let datePinned = false;

  if (/\btomorrow\b/.test(text)) {
    dayOffset = 1;
    datePinned = true;
  } else if (/\bday after tomorrow\b/.test(text)) {
    dayOffset = 2;
    datePinned = true;
  } else if (/\btoday\b|\btonight\b|\bthis (morning|afternoon|evening)\b/.test(text)) {
    datePinned = false; // still today, but the time may roll over if it has passed
  } else {
    const days = text.match(/\bin\s+(\d+)\s+days?\b/);
    if (days) {
      dayOffset = parseInt(days[1], 10);
      datePinned = true;
    } else {
      const weekday = Object.keys(WEEKDAYS).find((d) =>
        new RegExp(`\\b(on |next )?${d}\\b`).test(text)
      );
      if (weekday) {
        const target = WEEKDAYS[weekday];
        const delta = (target - now.getDay() + 7) % 7;
        // "on monday" said on a Monday means the next one unless a time later
        // today was given; the roll-forward below handles that case.
        dayOffset = delta;
        datePinned = true;
        if (delta === 0 && /\bnext\b/.test(text)) dayOffset = 7;
      }
    }
  }

  const assumedMeridiem = clock.meridiem === null && clock.hour >= 1 && clock.hour <= 12;

  const build = (hour24: number, offset: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    d.setHours(hour24, clock.minute, 0, 0);
    return d;
  };

  if (clock.meridiem !== null) {
    let hour24 = clock.hour % 12;
    if (clock.meridiem === "pm") hour24 += 12;
    let at = build(hour24, dayOffset);
    if (at.getTime() <= now.getTime() && !datePinned) at = build(hour24, dayOffset + 1);
    return { at, relative: false, assumedMeridiem: false };
  }

  if (!assumedMeridiem) {
    // 24-hour clock ("at 18:05") — unambiguous already.
    let at = build(clock.hour, dayOffset);
    if (at.getTime() <= now.getTime() && !datePinned) at = build(clock.hour, dayOffset + 1);
    return { at, relative: false, assumedMeridiem: false };
  }

  // Ambiguous: pick whichever of the am/pm pair comes first from now.
  const amHour = clock.hour % 12;
  const candidates = [build(amHour, dayOffset), build(amHour + 12, dayOffset)]
    .map((d) =>
      d.getTime() <= now.getTime() && !datePinned
        ? new Date(d.getTime() + DAY)
        : d
    )
    .sort((a, b) => a.getTime() - b.getTime());

  return { at: candidates[0], relative: false, assumedMeridiem: true };
}

// ---------- Formatting (for the spoken confirmation) ----------

/** "6:14 am" / "06:14" — the clock half of a confirmation. */
export function formatClock(at: Date, use24h = false): string {
  const h = at.getHours();
  const m = at.getMinutes().toString().padStart(2, "0");
  if (use24h) return `${h.toString().padStart(2, "0")}:${m}`;
  const suffix = h < 12 ? "am" : "pm";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/**
 * A phrase a speaker can say back: "tomorrow at 6:14 am", "today at 9:00 pm",
 * "Friday at 7:30 am", "on 3 October at 6:00 am".
 */
export function formatWhen(at: Date, now: Date, use24h = false): string {
  const startOfDay = (d: Date) => {
    const c = new Date(d);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
  };
  const days = Math.round((startOfDay(at) - startOfDay(now)) / DAY);
  const clock = formatClock(at, use24h);

  if (days === 0) return `today at ${clock}`;
  if (days === 1) return `tomorrow at ${clock}`;
  if (days > 1 && days < 7) return `${DAY_NAMES[at.getDay()]} at ${clock}`;
  return `on ${at.getDate()} ${at.toLocaleString("en-AU", { month: "long" })} at ${clock}`;
}

/** "10 minutes", "1 hour 30 minutes" — for timer confirmations. */
export function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts: string[] = [];
  if (hours) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (minutes) parts.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);
  if (seconds && !hours) parts.push(`${seconds} second${seconds === 1 ? "" : "s"}`);
  return parts.join(" ") || "0 seconds";
}
