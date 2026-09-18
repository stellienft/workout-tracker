import { describe, it, expect } from "vitest";
import {
  digitise,
  formatClock,
  formatDuration,
  formatWhen,
  parseDuration,
  parseWhen,
} from "@/lib/hub/when";
import {
  editDistance,
  matchesWake,
  parseIntent,
  parseRepeat,
  stripWake,
  type Intent,
} from "@/lib/hub/intents";
import {
  describeAlarm,
  describeAlarmList,
  describeRepeat,
  dueAlarms,
  effectiveFireAt,
  nextAlarm,
  nextFireAt,
} from "@/lib/hub/alarms";
import {
  describeCode,
  glanceWeather,
  isWet,
  speakWeather,
  type WeatherReport,
} from "@/lib/hub/weather";
import type { HubAlarm } from "@/lib/hub/types";

// Dates are built from local components so the suite is timezone-independent:
// the parser always works in the local time of the `now` it is given.
const at = (
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0
) => new Date(year, month - 1, day, hour, minute, 0, 0);

// Friday 18 September 2026, 10pm.
const FRIDAY_NIGHT = at(2026, 9, 18, 22, 0);
// Friday 18 September 2026, 9am.
const FRIDAY_MORNING = at(2026, 9, 18, 9, 0);

describe("digitise", () => {
  it("turns spoken numbers into digits", () => {
    expect(digitise("six thirty")).toBe("6 30");
    expect(digitise("twenty five")).toBe("25");
    expect(digitise("set an alarm for seven")).toBe("set an alarm for 7");
  });

  it("keeps tens that aren't part of a compound", () => {
    expect(digitise("thirty minutes")).toBe("30 minutes");
  });
});

describe("parseDuration", () => {
  it("parses single units", () => {
    expect(parseDuration("10 minutes")).toBe(600_000);
    expect(parseDuration("90 seconds")).toBe(90_000);
    expect(parseDuration("2 hours")).toBe(7_200_000);
  });

  it("sums compound durations", () => {
    expect(parseDuration("1 hour 30 minutes")).toBe(5_400_000);
  });

  it("handles spoken shorthands", () => {
    expect(parseDuration("half an hour")).toBe(1_800_000);
    expect(parseDuration("an hour and a half")).toBe(5_400_000);
    expect(parseDuration("ten minutes")).toBe(600_000);
  });

  it("returns null with no duration", () => {
    expect(parseDuration("what's the weather")).toBeNull();
  });
});

describe("parseWhen", () => {
  it("resolves relative times", () => {
    const result = parseWhen("in 20 minutes", FRIDAY_MORNING);
    expect(result?.relative).toBe(true);
    expect(result?.at.getTime()).toBe(FRIDAY_MORNING.getTime() + 1_200_000);
  });

  it("resolves an explicit am time to the next day when it has passed", () => {
    const result = parseWhen("set an alarm for 6:14 am", FRIDAY_NIGHT);
    expect(result?.at.getDate()).toBe(19);
    expect(result?.at.getHours()).toBe(6);
    expect(result?.at.getMinutes()).toBe(14);
  });

  it("keeps an explicit time later the same day", () => {
    const result = parseWhen("wake me at 6:14 pm", FRIDAY_MORNING);
    expect(result?.at.getDate()).toBe(18);
    expect(result?.at.getHours()).toBe(18);
  });

  it("pins the date when the phrase names one", () => {
    const result = parseWhen("tomorrow at 6:30 am", FRIDAY_NIGHT);
    expect(result?.at.getDate()).toBe(19);
    expect(result?.at.getHours()).toBe(6);
    expect(result?.at.getMinutes()).toBe(30);
  });

  it("picks the soonest slot when no meridiem is given", () => {
    // Said at 10pm, "6" means 6am — not 6pm tomorrow.
    const result = parseWhen("set an alarm for 6", FRIDAY_NIGHT);
    expect(result?.assumedMeridiem).toBe(true);
    expect(result?.at.getHours()).toBe(6);
    expect(result?.at.getDate()).toBe(19);
  });

  it("reads spoken times", () => {
    const result = parseWhen("set an alarm for six thirty in the morning", FRIDAY_NIGHT);
    expect(result?.at.getHours()).toBe(6);
    expect(result?.at.getMinutes()).toBe(30);
  });

  it("handles quarter and half past", () => {
    const half = parseWhen("wake me at half past six in the morning", FRIDAY_NIGHT);
    expect(half?.at.getHours()).toBe(6);
    expect(half?.at.getMinutes()).toBe(30);

    const quarterTo = parseWhen("alarm at quarter to seven in the morning", FRIDAY_NIGHT);
    expect(quarterTo?.at.getHours()).toBe(6);
    expect(quarterTo?.at.getMinutes()).toBe(45);
  });

  it("treats 24-hour clock times literally", () => {
    const result = parseWhen("set an alarm for 18:05", FRIDAY_MORNING);
    expect(result?.at.getHours()).toBe(18);
    expect(result?.at.getMinutes()).toBe(5);
    expect(result?.assumedMeridiem).toBe(false);
  });

  it("understands noon and midnight", () => {
    expect(parseWhen("at noon", FRIDAY_MORNING)?.at.getHours()).toBe(12);
    expect(parseWhen("at midnight", FRIDAY_MORNING)?.at.getHours()).toBe(0);
  });

  it("resolves weekday names to the next matching day", () => {
    const result = parseWhen("on monday at 7 am", FRIDAY_NIGHT);
    expect(result?.at.getDay()).toBe(1);
    expect(result?.at.getHours()).toBe(7);
  });

  it("returns null when there is no time at all", () => {
    expect(parseWhen("play some music", FRIDAY_MORNING)).toBeNull();
  });
});

describe("formatting", () => {
  it("formats clock times in both conventions", () => {
    expect(formatClock(at(2026, 9, 19, 6, 14))).toBe("6:14 am");
    expect(formatClock(at(2026, 9, 19, 18, 5), true)).toBe("18:05");
    expect(formatClock(at(2026, 9, 19, 0, 0))).toBe("12:00 am");
  });

  it("describes when relative to now", () => {
    expect(formatWhen(at(2026, 9, 19, 6, 14), FRIDAY_NIGHT)).toBe("tomorrow at 6:14 am");
    expect(formatWhen(at(2026, 9, 18, 23, 0), FRIDAY_NIGHT)).toBe("today at 11:00 pm");
    expect(formatWhen(at(2026, 9, 21, 7, 0), FRIDAY_NIGHT)).toBe("Monday at 7:00 am");
  });

  it("formats durations", () => {
    expect(formatDuration(600_000)).toBe("10 minutes");
    expect(formatDuration(5_400_000)).toBe("1 hour 30 minutes");
    expect(formatDuration(90_000)).toBe("1 minute 30 seconds");
  });
});

describe("editDistance", () => {
  it("measures edits", () => {
    expect(editDistance("stellio", "stellio")).toBe(0);
    expect(editDistance("stelio", "stellio")).toBe(1);
    expect(editDistance("stellium", "stellio")).toBe(2);
  });

  it("bails out past the bound instead of computing the true distance", () => {
    expect(editDistance("weather", "stellio", 2)).toBeGreaterThan(2);
  });
});

describe("wake word", () => {
  it("matches the wake word, including mis-hearings", () => {
    expect(matchesWake("hey stellio", "hey stellio")).toBe(true);
    expect(matchesWake("hey stelio what's the weather", "hey stellio")).toBe(true);
    expect(matchesWake("ok stellium set an alarm", "hey stellio")).toBe(true);
  });

  it("does not match unrelated speech", () => {
    expect(matchesWake("what a lovely day", "hey stellio")).toBe(false);
  });

  it("strips the wake word from the command", () => {
    expect(stripWake("hey stellio what's the weather", "hey stellio")).toBe(
      "what's the weather"
    );
    expect(stripWake("hey stelio set an alarm for 6 am", "hey stellio")).toBe(
      "set an alarm for 6 am"
    );
    // The wake word alone leaves nothing — the hub then waits for the command.
    expect(stripWake("hey stellio", "hey stellio")).toBe("");
  });

  it("leaves push-to-talk speech untouched", () => {
    expect(stripWake("set an alarm", "hey stellio")).toBe("set an alarm");
  });
});

describe("parseRepeat", () => {
  it("reads common recurrences", () => {
    expect(parseRepeat("every day")).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(parseRepeat("every weekday")).toEqual([1, 2, 3, 4, 5]);
    expect(parseRepeat("on weekends")).toEqual([0, 6]);
    expect(parseRepeat("every monday and wednesday")).toEqual([1, 3]);
  });

  it("returns null for one-shot phrasing", () => {
    expect(parseRepeat("tomorrow at 6")).toBeNull();
  });
});

const ctx = { now: FRIDAY_NIGHT };

function intentOf(text: string): Intent {
  return parseIntent(text, ctx);
}

describe("parseIntent", () => {
  it("sets alarms", () => {
    const intent = intentOf("set an alarm for 6:14 am");
    expect(intent.kind).toBe("set_alarm");
    if (intent.kind !== "set_alarm") throw new Error("wrong intent");
    expect(new Date(intent.at).getHours()).toBe(6);
    expect(intent.repeat).toBeNull();
  });

  it("sets recurring alarms", () => {
    const intent = intentOf("wake me at 6 am every weekday");
    expect(intent.kind).toBe("set_alarm");
    if (intent.kind !== "set_alarm") throw new Error("wrong intent");
    expect(intent.repeat).toEqual([1, 2, 3, 4, 5]);
  });

  it("sets timers", () => {
    const intent = intentOf("set a timer for 10 minutes");
    expect(intent).toEqual({ kind: "set_timer", ms: 600_000, label: null });
  });

  it("treats a bare duration as a timer", () => {
    expect(intentOf("set a 20 minute timer").kind).toBe("set_timer");
  });

  it("cancels alarms and timers separately", () => {
    expect(intentOf("cancel all my alarms")).toEqual({ kind: "cancel", target: "alarms" });
    expect(intentOf("cancel the timer")).toEqual({ kind: "cancel", target: "timers" });
  });

  it("lists alarms", () => {
    expect(intentOf("what alarms do I have").kind).toBe("list_alarms");
  });

  it("distinguishes a dismiss from stopping music", () => {
    expect(intentOf("stop")).toEqual({ kind: "stop" });
    expect(intentOf("stop the music")).toEqual({ kind: "music_control", action: "pause" });
  });

  it("snoozes with a default and an explicit duration", () => {
    expect(intentOf("snooze")).toEqual({ kind: "snooze", ms: 9 * 60_000 });
    expect(intentOf("snooze for 5 minutes")).toEqual({ kind: "snooze", ms: 300_000 });
  });

  it("reads weather windows", () => {
    expect(intentOf("what's the weather")).toEqual({
      kind: "weather",
      window: "now",
      place: null,
    });
    expect(intentOf("will it rain tomorrow")).toMatchObject({ window: "tomorrow" });
    expect(intentOf("what's the forecast for the week")).toMatchObject({ window: "week" });
    expect(intentOf("what's the weather in byron bay")).toMatchObject({
      place: "byron bay",
    });
  });

  it("plays music", () => {
    expect(intentOf("play fleetwood mac on spotify")).toEqual({
      kind: "music_play",
      query: "fleetwood mac",
    });
    expect(intentOf("play some music")).toEqual({ kind: "music_play", query: null });
    expect(intentOf("put on the dark side of the moon")).toMatchObject({
      kind: "music_play",
    });
  });

  it("controls playback", () => {
    expect(intentOf("skip")).toEqual({ kind: "music_control", action: "next" });
    expect(intentOf("go back")).toEqual({ kind: "music_control", action: "previous" });
    expect(intentOf("resume")).toEqual({ kind: "music_control", action: "resume" });
  });

  it("sets volume absolutely and relatively", () => {
    expect(intentOf("set the volume to 40")).toEqual({
      kind: "music_volume",
      level: 40,
      direction: null,
    });
    expect(intentOf("turn it up")).toEqual({
      kind: "music_volume",
      level: null,
      direction: "up",
    });
    expect(intentOf("quieter")).toMatchObject({ direction: "down" });
  });

  it("answers clock questions", () => {
    expect(intentOf("what time is it").kind).toBe("time");
    expect(intentOf("what's the date").kind).toBe("date");
  });

  it("matches custom routines before anything else", () => {
    const intent = parseIntent("good morning", {
      now: FRIDAY_NIGHT,
      routines: [{ slug: "good-morning", phrase: "good morning" }],
    });
    expect(intent).toEqual({ kind: "routine", slug: "good-morning" });
  });

  it("falls back to unknown so the LLM interpreter can try", () => {
    const intent = intentOf("how many grams are in an ounce");
    expect(intent.kind).toBe("unknown");
  });
});

// ---- Alarms ----

const alarm = (overrides: Partial<HubAlarm> = {}): HubAlarm => ({
  id: "a1",
  kind: "alarm",
  fireAt: at(2026, 9, 19, 6, 14).toISOString(),
  label: null,
  repeatDays: null,
  enabled: true,
  snoozedUntil: null,
  ...overrides,
});

describe("alarm scheduling", () => {
  it("rolls a recurring alarm forward to the next matching day", () => {
    // Friday night; a weekday alarm next fires Monday.
    const next = nextFireAt(at(2026, 9, 18, 6, 14), [1, 2, 3, 4, 5], FRIDAY_NIGHT);
    expect(next?.getDay()).toBe(1);
    expect(next?.getHours()).toBe(6);
    expect(next?.getMinutes()).toBe(14);
  });

  it("returns null for a one-shot alarm", () => {
    expect(nextFireAt(at(2026, 9, 18, 6, 14), null, FRIDAY_NIGHT)).toBeNull();
  });

  it("honours an active snooze", () => {
    const snoozed = alarm({ snoozedUntil: at(2026, 9, 19, 6, 23).toISOString() });
    expect(effectiveFireAt(snoozed).getMinutes()).toBe(23);
  });

  it("reports alarms that are due now", () => {
    const now = at(2026, 9, 19, 6, 14);
    expect(dueAlarms([alarm()], now)).toHaveLength(1);
    expect(dueAlarms([alarm()], at(2026, 9, 19, 6, 13))).toHaveLength(0);
    // Long past: outside the grace window, so it doesn't ring on page load.
    expect(dueAlarms([alarm()], at(2026, 9, 19, 8, 0))).toHaveLength(0);
  });

  it("skips disabled alarms", () => {
    expect(dueAlarms([alarm({ enabled: false })], at(2026, 9, 19, 6, 14))).toHaveLength(0);
  });

  it("finds the next upcoming alarm", () => {
    const soon = alarm({ id: "soon", fireAt: at(2026, 9, 19, 5, 0).toISOString() });
    const later = alarm({ id: "later", fireAt: at(2026, 9, 19, 9, 0).toISOString() });
    expect(nextAlarm([later, soon], FRIDAY_NIGHT)?.id).toBe("soon");
  });

  it("describes recurrence in words", () => {
    expect(describeRepeat([1, 2, 3, 4, 5])).toBe("every weekday");
    expect(describeRepeat([0, 1, 2, 3, 4, 5, 6])).toBe("every day");
    expect(describeRepeat([0, 6])).toBe("every weekend");
    expect(describeRepeat([1, 3])).toBe("every Mon, Wed");
    expect(describeRepeat(null)).toBeNull();
  });

  it("describes a single alarm", () => {
    expect(describeAlarm(alarm(), FRIDAY_NIGHT)).toBe("tomorrow at 6:14 am");
    expect(describeAlarm(alarm({ label: "the gym" }), FRIDAY_NIGHT)).toBe(
      "tomorrow at 6:14 am for the gym"
    );
    expect(describeAlarm(alarm({ repeatDays: [1, 2, 3, 4, 5] }), FRIDAY_NIGHT)).toBe(
      "every weekday at 6:14 am"
    );
  });

  it("describes an empty list", () => {
    expect(describeAlarmList([], FRIDAY_NIGHT)).toBe("You have no alarms or timers set.");
  });

  it("describes alarms and timers together", () => {
    const timer = alarm({
      id: "t1",
      kind: "timer",
      fireAt: new Date(FRIDAY_NIGHT.getTime() + 600_000).toISOString(),
    });
    const spoken = describeAlarmList([alarm(), timer], FRIDAY_NIGHT);
    expect(spoken).toContain("One alarm: tomorrow at 6:14 am.");
    expect(spoken).toContain("10 minutes left");
  });
});

// ---- Weather ----

const report: WeatherReport = {
  place: "Brisbane",
  units: "metric",
  current: {
    temperature: 24,
    feelsLike: 26,
    code: 2,
    humidity: 60,
    windKph: 12,
    isDay: true,
  },
  days: [
    { date: "2026-09-18", code: 61, high: 27, low: 17, rainChance: 70 },
    { date: "2026-09-19", code: 0, high: 29, low: 18, rainChance: 5 },
    { date: "2026-09-20", code: 3, high: 26, low: 16, rainChance: 20 },
  ],
};

describe("weather phrasing", () => {
  it("maps WMO codes to spoken descriptions", () => {
    expect(describeCode(0)).toBe("clear");
    expect(describeCode(61)).toBe("light rain");
    expect(describeCode(95)).toBe("thunderstorms");
    expect(describeCode(1234)).toBe("unsettled");
  });

  it("knows which codes mean rain", () => {
    expect(isWet(61)).toBe(true);
    expect(isWet(0)).toBe(false);
    expect(isWet(2)).toBe(false);
  });

  it("speaks current conditions with a rain warning", () => {
    const spoken = speakWeather(report, "now");
    expect(spoken).toContain("24 degrees in Brisbane");
    expect(spoken).toContain("partly cloudy");
    expect(spoken).toContain("70 percent chance of rain");
  });

  it("speaks tomorrow's outlook", () => {
    const spoken = speakWeather(report, "tomorrow");
    expect(spoken).toContain("Tomorrow in Brisbane");
    expect(spoken).toContain("between 18 and 29");
  });

  it("summarises the week rather than reading every day", () => {
    const spoken = speakWeather(report, "week");
    expect(spoken).toContain("between 16 and 29");
    expect(spoken).toContain("wettest day");
  });

  it("builds a glance line for the display", () => {
    expect(glanceWeather(report)).toBe("24°C partly cloudy · 17°C–27°C");
  });
});
