"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_HUB_SETTINGS,
  STARTER_ROUTINES,
  type HubAlarm,
  type HubRoutine,
  type HubSettings,
  type RoutineStep,
} from "@/lib/hub/types";
import { nextFireAt } from "@/lib/hub/alarms";

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

type Row = Record<string, unknown>;

function toSettings(row: Row | null): HubSettings {
  if (!row) return { ...DEFAULT_HUB_SETTINGS };
  return {
    wakeWord: (row.wake_word as string) ?? DEFAULT_HUB_SETTINGS.wakeWord,
    wakeEnabled: (row.wake_enabled as boolean) ?? true,
    voiceName: (row.voice_name as string) ?? null,
    voiceRate: Number(row.voice_rate ?? 1),
    voicePitch: Number(row.voice_pitch ?? 1),
    speakConfirmations: (row.speak_confirmations as boolean) ?? true,
    placeLabel: (row.place_label as string) ?? null,
    latitude: row.latitude === null || row.latitude === undefined ? null : Number(row.latitude),
    longitude: row.longitude === null || row.longitude === undefined ? null : Number(row.longitude),
    units: ((row.units as string) === "imperial" ? "imperial" : "metric"),
    use24h: (row.use_24h as boolean) ?? false,
    quietStart: row.quiet_start === null || row.quiet_start === undefined ? null : Number(row.quiet_start),
    quietEnd: row.quiet_end === null || row.quiet_end === undefined ? null : Number(row.quiet_end),
    nightDim: (row.night_dim as boolean) ?? true,
    spotifyDeviceId: (row.spotify_device_id as string) ?? null,
    spotifyDeviceName: (row.spotify_device_name as string) ?? null,
    displayName: (row.display_name as string) ?? null,
  };
}

function toAlarm(row: Row): HubAlarm {
  return {
    id: row.id as string,
    kind: (row.kind as "alarm" | "timer") ?? "alarm",
    fireAt: row.fire_at as string,
    label: (row.label as string) ?? null,
    repeatDays: (row.repeat_days as number[] | null) ?? null,
    enabled: (row.enabled as boolean) ?? true,
    snoozedUntil: (row.snoozed_until as string) ?? null,
  };
}

function toRoutine(row: Row): HubRoutine {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    phrase: row.phrase as string,
    steps: (row.steps as RoutineStep[]) ?? [],
    enabled: (row.enabled as boolean) ?? true,
    scheduleHour: row.schedule_hour === null || row.schedule_hour === undefined ? null : Number(row.schedule_hour),
    scheduleMinute:
      row.schedule_minute === null || row.schedule_minute === undefined ? null : Number(row.schedule_minute),
    scheduleDays: (row.schedule_days as number[] | null) ?? null,
  };
}

export interface HubState {
  settings: HubSettings;
  alarms: HubAlarm[];
  routines: HubRoutine[];
}

/**
 * Everything the hub needs to boot. Creates the settings row and the starter
 * routines on first load so a new device is useful immediately.
 */
export async function getHubState(): Promise<HubState | null> {
  const { supabase, user } = await auth();
  if (!user) return null;

  const [{ data: settingsRow }, { data: alarmRows }, { data: routineRows }] = await Promise.all([
    supabase.from("hub_settings").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("hub_alarms")
      .select("*")
      .eq("user_id", user.id)
      .order("fire_at", { ascending: true }),
    supabase.from("hub_routines").select("*").eq("user_id", user.id).order("created_at"),
  ]);

  let settings = toSettings(settingsRow as Row | null);
  if (!settingsRow) {
    // Seed the member's name so the hub can greet them by it.
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();
    const displayName = ((profile?.full_name as string) ?? "").split(" ")[0] || null;
    await supabase
      .from("hub_settings")
      .upsert({ user_id: user.id, display_name: displayName }, { onConflict: "user_id" });
    settings = { ...settings, displayName };
  }

  let routines = (routineRows ?? []).map((r) => toRoutine(r as Row));
  if (routines.length === 0) {
    const { data: seeded } = await supabase
      .from("hub_routines")
      .upsert(
        STARTER_ROUTINES.map((r) => ({
          user_id: user.id,
          slug: r.slug,
          name: r.name,
          phrase: r.phrase,
          steps: r.steps,
        })),
        { onConflict: "user_id,slug" }
      )
      .select();
    routines = (seeded ?? []).map((r) => toRoutine(r as Row));
  }

  return {
    settings,
    alarms: (alarmRows ?? []).map((r) => toAlarm(r as Row)),
    routines,
  };
}

/**
 * Heartbeat from an open hub. The every-minute alarm cron uses this to tell a
 * live device (which rings alarms itself) from an absent one (which needs the
 * push), so an alarm never fires twice in two places.
 */
export async function touchHub() {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const };
  await supabase
    .from("hub_settings")
    .upsert(
      { user_id: user.id, last_seen_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  return { ok: true as const };
}

const settingsSchema = z.object({
  wakeWord: z.string().min(2).max(40).optional(),
  wakeEnabled: z.boolean().optional(),
  voiceName: z.string().max(120).nullable().optional(),
  voiceRate: z.coerce.number().min(0.5).max(2).optional(),
  voicePitch: z.coerce.number().min(0).max(2).optional(),
  speakConfirmations: z.boolean().optional(),
  placeLabel: z.string().max(120).nullable().optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  units: z.enum(["metric", "imperial"]).optional(),
  use24h: z.boolean().optional(),
  quietStart: z.coerce.number().int().min(0).max(23).nullable().optional(),
  quietEnd: z.coerce.number().int().min(0).max(23).nullable().optional(),
  nightDim: z.boolean().optional(),
  spotifyDeviceId: z.string().max(200).nullable().optional(),
  spotifyDeviceName: z.string().max(200).nullable().optional(),
  displayName: z.string().max(80).nullable().optional(),
});

const COLUMN: Record<string, string> = {
  wakeWord: "wake_word",
  wakeEnabled: "wake_enabled",
  voiceName: "voice_name",
  voiceRate: "voice_rate",
  voicePitch: "voice_pitch",
  speakConfirmations: "speak_confirmations",
  placeLabel: "place_label",
  latitude: "latitude",
  longitude: "longitude",
  units: "units",
  use24h: "use_24h",
  quietStart: "quiet_start",
  quietEnd: "quiet_end",
  nightDim: "night_dim",
  spotifyDeviceId: "spotify_device_id",
  spotifyDeviceName: "spotify_device_name",
  displayName: "display_name",
};

export async function saveHubSettings(input: Record<string, unknown>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid settings" };

  const patch: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString() };
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value === undefined) continue;
    patch[COLUMN[key]] = value;
  }

  const { error } = await supabase
    .from("hub_settings")
    .upsert(patch, { onConflict: "user_id" });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

const alarmSchema = z.object({
  at: z.string().datetime(),
  kind: z.enum(["alarm", "timer"]).default("alarm"),
  label: z.string().max(120).nullable().optional(),
  repeatDays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
});

export async function createAlarm(input: Record<string, unknown>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = alarmSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid alarm" };

  const { data, error } = await supabase
    .from("hub_alarms")
    .insert({
      user_id: user.id,
      kind: parsed.data.kind,
      fire_at: parsed.data.at,
      label: parsed.data.label ?? null,
      repeat_days:
        parsed.data.repeatDays && parsed.data.repeatDays.length > 0
          ? parsed.data.repeatDays
          : null,
    })
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, alarm: toAlarm(data as Row) };
}

/**
 * Mark an alarm as rung. A repeating alarm rolls forward to its next weekday;
 * a one-shot is disabled so it stays visible in the list but never fires again.
 */
export async function dismissAlarm(id: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { data } = await supabase
    .from("hub_alarms")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { ok: false as const, error: "Alarm not found" };

  const alarm = toAlarm(data as Row);
  const now = new Date();
  const next = nextFireAt(new Date(alarm.fireAt), alarm.repeatDays, now);

  const patch = next
    ? {
        fire_at: next.toISOString(),
        enabled: true,
        snoozed_until: null,
        last_fired_at: now.toISOString(),
        dismissed_at: null,
      }
    : {
        enabled: false,
        snoozed_until: null,
        last_fired_at: now.toISOString(),
        dismissed_at: now.toISOString(),
      };

  const { error } = await supabase
    .from("hub_alarms")
    .update(patch)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };

  // Timers are single-use; clear them out rather than leaving dead rows behind.
  if (!next && alarm.kind === "timer") {
    await supabase.from("hub_alarms").delete().eq("id", id).eq("user_id", user.id);
  }
  return { ok: true as const, next: next?.toISOString() ?? null };
}

export async function snoozeAlarm(id: string, ms: number) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const delay = Math.max(60_000, Math.min(60 * 60_000, Math.round(ms)));
  const until = new Date(Date.now() + delay).toISOString();

  const { error } = await supabase
    .from("hub_alarms")
    .update({ snoozed_until: until, enabled: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, until };
}

export async function setAlarmEnabled(id: string, enabled: boolean) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { error } = await supabase
    .from("hub_alarms")
    .update({ enabled, snoozed_until: null })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function deleteAlarm(id: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { error } = await supabase
    .from("hub_alarms")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** "Cancel all my alarms" / "cancel the timer". Returns how many went. */
export async function cancelAlarms(target: "alarms" | "timers" | "all") {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated", count: 0 };

  // count: "exact" asks PostgREST to report how many rows the delete removed,
  // so the hub can say "cancelled 2 alarms" rather than a vague "done".
  let query = supabase
    .from("hub_alarms")
    .delete({ count: "exact" })
    .eq("user_id", user.id);
  if (target !== "all") {
    query = query.eq("kind", target === "alarms" ? "alarm" : "timer");
  }
  const { error, count } = await query;
  if (error) return { ok: false as const, error: error.message, count: 0 };
  return { ok: true as const, count: count ?? 0 };
}

export async function listAlarms(): Promise<HubAlarm[]> {
  const { supabase, user } = await auth();
  if (!user) return [];
  const { data } = await supabase
    .from("hub_alarms")
    .select("*")
    .eq("user_id", user.id)
    .order("fire_at", { ascending: true });
  return (data ?? []).map((r) => toAlarm(r as Row));
}

const stepSchema: z.ZodType<RoutineStep> = z.union([
  z.object({ type: z.literal("speak"), text: z.string().max(500) }),
  z.object({
    type: z.literal("weather"),
    window: z.enum(["now", "today", "tomorrow", "week"]),
  }),
  z.object({ type: z.literal("time") }),
  z.object({
    type: z.literal("music"),
    query: z.string().max(200).nullable(),
    volume: z.number().int().min(0).max(100).optional(),
  }),
  z.object({ type: z.literal("pause_music") }),
  z.object({ type: z.literal("wait"), ms: z.number().int().min(0).max(600_000) }),
]);

const routineSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(80),
  phrase: z.string().min(2).max(80),
  steps: z.array(stepSchema).max(12),
  enabled: z.boolean().default(true),
  scheduleHour: z.number().int().min(0).max(23).nullable().optional(),
  scheduleMinute: z.number().int().min(0).max(59).nullable().optional(),
  scheduleDays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
});

export async function saveRoutine(input: Record<string, unknown>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = routineSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid routine" };
  const r = parsed.data;

  const { data, error } = await supabase
    .from("hub_routines")
    .upsert(
      {
        ...(r.id ? { id: r.id } : {}),
        user_id: user.id,
        slug: r.slug,
        name: r.name,
        phrase: r.phrase,
        steps: r.steps,
        enabled: r.enabled,
        schedule_hour: r.scheduleHour ?? null,
        schedule_minute: r.scheduleMinute ?? null,
        schedule_days: r.scheduleDays && r.scheduleDays.length > 0 ? r.scheduleDays : null,
      },
      { onConflict: "user_id,slug" }
    )
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, routine: toRoutine(data as Row) };
}

export async function deleteRoutine(id: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { error } = await supabase
    .from("hub_routines")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}
