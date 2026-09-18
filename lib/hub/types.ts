/**
 * Shared hub types. Deliberately free of server-only imports so both the
 * kiosk client and the server actions/route handlers can use them.
 */

export type HubUnits = "metric" | "imperial";

export interface HubSettings {
  wakeWord: string;
  wakeEnabled: boolean;
  voiceName: string | null;
  voiceRate: number;
  voicePitch: number;
  speakConfirmations: boolean;
  placeLabel: string | null;
  latitude: number | null;
  longitude: number | null;
  units: HubUnits;
  use24h: boolean;
  quietStart: number | null;
  quietEnd: number | null;
  nightDim: boolean;
  spotifyDeviceId: string | null;
  spotifyDeviceName: string | null;
  displayName: string | null;
}

export const DEFAULT_HUB_SETTINGS: HubSettings = {
  wakeWord: "hey stellio",
  wakeEnabled: true,
  voiceName: null,
  voiceRate: 1,
  voicePitch: 1,
  speakConfirmations: true,
  placeLabel: null,
  latitude: null,
  longitude: null,
  units: "metric",
  use24h: false,
  quietStart: 22,
  quietEnd: 6,
  nightDim: true,
  spotifyDeviceId: null,
  spotifyDeviceName: null,
  displayName: null,
};

export interface HubAlarm {
  id: string;
  kind: "alarm" | "timer";
  /** ISO instant the alarm next fires. */
  fireAt: string;
  label: string | null;
  /** Day-of-week recurrence, 0 = Sunday. Null for one-shot. */
  repeatDays: number[] | null;
  enabled: boolean;
  snoozedUntil: string | null;
}

/** A step in a routine. Executed in order by the hub client. */
export type RoutineStep =
  | { type: "speak"; text: string }
  | { type: "weather"; window: "now" | "today" | "tomorrow" | "week" }
  | { type: "time" }
  | { type: "music"; query: string | null; volume?: number }
  | { type: "pause_music" }
  | { type: "wait"; ms: number };

export interface HubRoutine {
  id: string;
  slug: string;
  name: string;
  /** What you say to run it: "good morning". */
  phrase: string;
  steps: RoutineStep[];
  enabled: boolean;
  scheduleHour: number | null;
  scheduleMinute: number | null;
  scheduleDays: number[] | null;
}

/**
 * The two routines every hub starts with, so a fresh device does something
 * useful before the owner has configured anything.
 */
export const STARTER_ROUTINES: Omit<HubRoutine, "id">[] = [
  {
    slug: "good-morning",
    name: "Good morning",
    phrase: "good morning",
    enabled: true,
    scheduleHour: null,
    scheduleMinute: null,
    scheduleDays: null,
    steps: [
      { type: "speak", text: "Good morning." },
      { type: "time" },
      { type: "weather", window: "today" },
      { type: "music", query: "morning acoustic", volume: 35 },
    ],
  },
  {
    slug: "good-night",
    name: "Good night",
    phrase: "good night",
    enabled: true,
    scheduleHour: null,
    scheduleMinute: null,
    scheduleDays: null,
    steps: [
      { type: "pause_music" },
      { type: "weather", window: "tomorrow" },
      { type: "speak", text: "Good night. Sleep well." },
    ],
  },
];

/** True when `hour` falls inside the configured quiet window (wraps midnight). */
export function inQuietHours(settings: HubSettings, hour: number): boolean {
  const { quietStart, quietEnd } = settings;
  if (quietStart === null || quietEnd === null) return false;
  if (quietStart === quietEnd) return false;
  return quietStart < quietEnd
    ? hour >= quietStart && hour < quietEnd
    : hour >= quietStart || hour < quietEnd;
}
