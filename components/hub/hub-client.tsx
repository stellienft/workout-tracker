"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlarmClock, Maximize2, Mic, Settings, X } from "lucide-react";
import { useWakeLock } from "@/lib/use-wake-lock";
import { VoiceController, type VoiceState } from "@/lib/hub/speech";
import { parseIntent, type Intent } from "@/lib/hub/intents";
import { cancelSpeech, speak, unlockTts } from "@/lib/hub/tts";
import { executeIntent, runRoutineNow, type ExecuteDeps } from "@/lib/hub/execute";
import { dueAlarms, nextAlarm as pickNextAlarm } from "@/lib/hub/alarms";
import { inQuietHours, type HubAlarm, type HubRoutine, type HubSettings } from "@/lib/hub/types";
import type { HubState } from "@/lib/actions/hub";
import {
  createAlarm,
  deleteAlarm,
  dismissAlarm,
  listAlarms,
  saveHubSettings,
  setAlarmEnabled,
  snoozeAlarm,
  touchHub,
} from "@/lib/actions/hub";
import { HubFace } from "@/components/hub/hub-face";
import { VoiceBar, type Exchange } from "@/components/hub/voice-bar";
import { AlarmRing } from "@/components/hub/alarm-ring";
import { MusicCard, type HubTrack } from "@/components/hub/music-card";
import { AlarmsPanel } from "@/components/hub/alarms-panel";
import { SettingsPanel } from "@/components/hub/settings-panel";

const WEATHER_POLL_MS = 10 * 60_000;
const HEARTBEAT_MS = 60_000;
const TRACK_POLL_MS = 20_000;
const SNOOZE_MS = 9 * 60_000;

type Panel = "none" | "alarms" | "settings";

/**
 * The hub itself: a kiosk surface that listens, answers out loud, and runs the
 * handful of things a bench-top speaker is actually for.
 *
 * Two things shape the structure here:
 *  1. Browsers require a user gesture before audio and the microphone work, so
 *     the hub opens behind a "tap to start" gate that unlocks both at once.
 *  2. The voice controller lives in a ref, not in state. Its callbacks are
 *     created once, so everything they read comes from `latest` — otherwise
 *     every render would tear down and rebuild the recogniser mid-sentence.
 */
export function HubClient({
  initial,
  spotifyConnected,
}: {
  initial: HubState;
  spotifyConnected: boolean;
}) {
  const [settings, setSettings] = useState<HubSettings>(initial.settings);
  const [alarms, setAlarms] = useState<HubAlarm[]>(initial.alarms);
  const [routines] = useState<HubRoutine[]>(initial.routines);

  const [now, setNow] = useState(() => new Date());
  const [started, setStarted] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("off");
  const [partial, setPartial] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const [exchange, setExchange] = useState<Exchange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ringing, setRinging] = useState<HubAlarm | null>(null);
  const [weatherGlance, setWeatherGlance] = useState<string | null>(null);
  const [track, setTrack] = useState<HubTrack | null>(null);
  const [panel, setPanel] = useState<Panel>("none");

  const controller = useRef<VoiceController | null>(null);
  const ringingRef = useRef<HubAlarm | null>(null);
  const lastRoutineKey = useRef<string>("");

  // Single source of truth for the voice callbacks, which close over nothing.
  const latest = useRef({ settings, alarms, routines, ringing });
  latest.current = { settings, alarms, routines, ringing };
  ringingRef.current = ringing;

  useWakeLock(started);

  // ---- Clock ----
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // ---- Speaking ----
  const speakLine = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const { settings: s } = latest.current;
    if (!s.speakConfirmations) return;
    setSpeaking(true);
    try {
      await speak(text, {
        voiceName: s.voiceName,
        rate: s.voiceRate,
        pitch: s.voicePitch,
      });
    } finally {
      setSpeaking(false);
    }
  }, []);

  // ---- Data refreshers ----
  const reloadAlarms = useCallback(async () => {
    const fresh = await listAlarms();
    setAlarms(fresh);
    return fresh;
  }, []);

  const refreshWeather = useCallback(async () => {
    try {
      const res = await fetch("/api/hub/weather?window=now", { cache: "no-store" });
      const data = (await res.json()) as { glance?: string };
      if (data.glance) setWeatherGlance(data.glance);
    } catch {
      // Ambient data — a failed poll just leaves the last value on screen.
    }
  }, []);

  const refreshTrack = useCallback(async () => {
    if (!spotifyConnected) return null;
    try {
      const res = await fetch("/api/spotify/now-playing", { cache: "no-store" });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        playing: HubTrack | null;
      };
      setTrack(data.playing);
      return data.playing;
    } catch {
      return null;
    }
  }, [spotifyConnected]);

  // ---- Ringing ----
  const stopRinging = useCallback(async () => {
    const current = ringingRef.current;
    if (!current) return false;
    setRinging(null);
    await dismissAlarm(current.id);
    await reloadAlarms();
    return true;
  }, [reloadAlarms]);

  const snoozeRinging = useCallback(async () => {
    const current = ringingRef.current;
    if (!current) return;
    setRinging(null);
    await snoozeAlarm(current.id, SNOOZE_MS);
    await reloadAlarms();
  }, [reloadAlarms]);

  // ---- Intent execution ----
  const deps = useMemo<ExecuteDeps>(
    () => ({
      get settings() {
        return latest.current.settings;
      },
      get routines() {
        return latest.current.routines;
      },
      get alarms() {
        return latest.current.alarms;
      },
      now: () => new Date(),
      reloadAlarms,
      speak: speakLine,
      dismissRinging: stopRinging,
      ringingAlarm: () => ringingRef.current,
      refreshNowPlaying: async () => {
        const playing = await refreshTrack();
        return playing ? { title: playing.title, artist: playing.artist } : null;
      },
      onWeather: setWeatherGlance,
    }),
    [reloadAlarms, refreshTrack, speakLine, stopRinging]
  );

  /** Ask the server-side interpreter to classify what the local parser couldn't. */
  const interpret = useCallback(async (text: string): Promise<Intent | null> => {
    try {
      const res = await fetch("/api/hub/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          now: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { intent: Intent | null };
      return data.intent;
    } catch {
      return null;
    }
  }, []);

  const handleCommand = useCallback(
    async (text: string) => {
      const command = text.trim();
      if (!command) return;

      controller.current?.setMuted(true);
      setPartial("");
      setVoiceState("busy");
      setError(null);

      try {
        const triggers = latest.current.routines
          .filter((r) => r.enabled)
          .map((r) => ({ slug: r.slug, phrase: r.phrase }));

        let intent = parseIntent(command, { now: new Date(), routines: triggers });
        // Only the long tail goes to the network — everything the local parser
        // understands is handled without a round trip.
        if (intent.kind === "unknown") {
          const remote = await interpret(command);
          if (remote) intent = remote;
        }

        const reply = await executeIntent(intent, deps);
        setExchange({ id: `${Date.now()}`, you: command, hub: reply || "…" });
        if (reply) await speakLine(reply);
      } catch {
        setExchange({ id: `${Date.now()}`, you: command, hub: "Something went wrong." });
      } finally {
        controller.current?.setMuted(false);
      }
    },
    [deps, interpret, speakLine]
  );

  const handleCommandRef = useRef(handleCommand);
  handleCommandRef.current = handleCommand;

  // ---- Voice controller lifecycle ----
  useEffect(() => {
    if (!started) return;

    const instance = new VoiceController(
      {
        wakeWord: latest.current.settings.wakeWord,
        wakeEnabled: latest.current.settings.wakeEnabled,
        lang: navigator.language || "en-AU",
      },
      {
        onState: setVoiceState,
        onPartial: setPartial,
        onWake: () => {
          setPartial("");
          setExchange(null);
        },
        onCommand: (text) => void handleCommandRef.current(text),
        onError: (code, message) => {
          // Network blips are transient and self-healing; don't alarm the user.
          if (code !== "network") setError(message);
        },
      }
    );
    controller.current = instance;
    instance.start();

    return () => {
      instance.stop();
      controller.current = null;
      cancelSpeech();
    };
  }, [started]);

  // Wake word and always-listening changes apply without rebuilding the loop.
  useEffect(() => {
    controller.current?.updateConfig({
      wakeWord: settings.wakeWord,
      wakeEnabled: settings.wakeEnabled,
    });
  }, [settings.wakeWord, settings.wakeEnabled]);

  // ---- Alarm firing (local, precise, works offline) ----
  useEffect(() => {
    if (ringing) return;
    const due = dueAlarms(alarms, now);
    if (due.length === 0) return;
    const alarm = due[0];
    setRinging(alarm);
    void speakLine(
      alarm.kind === "timer"
        ? `Your ${alarm.label ? `${alarm.label} ` : ""}timer is done.`
        : alarm.label
          ? `Alarm: ${alarm.label}.`
          : "Alarm."
    );
  }, [alarms, now, ringing, speakLine]);

  // While an alarm rings, skip the wake word — "stop" alone should work.
  useEffect(() => {
    if (!ringing || !started) return;
    if (voiceState !== "wake") return;
    const timer = setTimeout(() => controller.current?.listenNow(), 600);
    return () => clearTimeout(timer);
  }, [ringing, started, voiceState]);

  // ---- Scheduled routines ----
  useEffect(() => {
    if (!started) return;
    const key = `${now.getHours()}:${now.getMinutes()}`;
    if (lastRoutineKey.current === key) return;
    lastRoutineKey.current = key;

    const day = now.getDay();
    const due = routines.filter(
      (r) =>
        r.enabled &&
        r.scheduleHour === now.getHours() &&
        r.scheduleMinute === now.getMinutes() &&
        (!r.scheduleDays || r.scheduleDays.length === 0 || r.scheduleDays.includes(day))
    );
    for (const routine of due) {
      void runRoutineNow(routine, deps);
    }
  }, [now, routines, started, deps]);

  // ---- Polling ----
  useEffect(() => {
    if (!started) return;
    void refreshWeather();
    const timer = setInterval(refreshWeather, WEATHER_POLL_MS);
    return () => clearInterval(timer);
  }, [started, refreshWeather]);

  // Tell the server this hub is live, so the alarm cron doesn't double up with
  // a push notification for an alarm this device is already ringing.
  useEffect(() => {
    if (!started) return;
    void touchHub();
    const timer = setInterval(() => void touchHub(), HEARTBEAT_MS);
    return () => clearInterval(timer);
  }, [started]);

  useEffect(() => {
    if (!started || !spotifyConnected) return;
    void refreshTrack();
    const timer = setInterval(refreshTrack, TRACK_POLL_MS);
    return () => clearInterval(timer);
  }, [started, spotifyConnected, refreshTrack]);

  // ---- Settings ----
  const saveSettings = useCallback((patch: Partial<HubSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    void saveHubSettings(patch as Record<string, unknown>);
  }, []);

  // ---- Kiosk chrome ----
  const begin = useCallback(() => {
    unlockTts();
    setStarted(true);
  }, []);

  const goFullscreen = useCallback(() => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  }, []);

  const dimmed = settings.nightDim && inQuietHours(settings, now.getHours());
  const next = pickNextAlarm(alarms, now);

  const musicControl = useCallback(
    (action: "pause" | "resume" | "next" | "previous") => {
      void fetch("/api/spotify/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }).then(() => setTimeout(refreshTrack, 600));
    },
    [refreshTrack]
  );

  const musicVolume = useCallback((direction: "up" | "down") => {
    void fetch("/api/spotify/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "volume", direction }),
    });
  }, []);

  if (!started) {
    return <StartGate onStart={begin} wakeWord={settings.wakeWord} />;
  }

  return (
    <div
      className={`relative min-h-dvh px-6 py-6 sm:px-10 sm:py-8 transition-colors duration-1000 ${
        dimmed ? "bg-black" : "bg-[var(--background-primary)]"
      }`}
    >
      {/* Top-right chrome. Small on purpose: this is a display, not an app. */}
      <div className="absolute right-5 top-5 z-10 flex gap-2">
        <IconButton label="Alarms" onClick={() => setPanel("alarms")}>
          <AlarmClock className="h-5 w-5" />
        </IconButton>
        <IconButton label="Hub settings" onClick={() => setPanel("settings")}>
          <Settings className="h-5 w-5" />
        </IconButton>
        <IconButton label="Fullscreen" onClick={goFullscreen}>
          <Maximize2 className="h-5 w-5" />
        </IconButton>
      </div>

      <div className="mx-auto grid min-h-[calc(100dvh-3rem)] max-w-6xl gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <HubFace
          now={now}
          settings={settings}
          weatherGlance={weatherGlance}
          nextAlarm={next}
          dimmed={dimmed}
        />

        <div className="flex flex-col justify-center gap-6">
          <VoiceBar
            state={voiceState}
            partial={partial}
            speaking={speaking}
            lastExchange={exchange}
            error={error}
            onPushToTalk={() => {
              unlockTts();
              cancelSpeech();
              controller.current?.listenNow();
            }}
          />
          <MusicCard
            track={track}
            connected={spotifyConnected}
            onControl={musicControl}
            onVolume={musicVolume}
          />
        </div>
      </div>

      {ringing ? (
        <AlarmRing
          alarm={ringing}
          now={now}
          use24h={settings.use24h}
          onDismiss={() => void stopRinging()}
          onSnooze={() => void snoozeRinging()}
        />
      ) : null}

      {panel !== "none" ? (
        <Sheet
          title={panel === "alarms" ? "Alarms and timers" : "Hub settings"}
          onClose={() => setPanel("none")}
        >
          {panel === "alarms" ? (
            <AlarmsPanel
              alarms={alarms}
              now={now}
              use24h={settings.use24h}
              onToggle={(id, enabled) => {
                setAlarms((prev) =>
                  prev.map((a) => (a.id === id ? { ...a, enabled } : a))
                );
                void setAlarmEnabled(id, enabled).then(reloadAlarms);
              }}
              onDelete={(id) => {
                setAlarms((prev) => prev.filter((a) => a.id !== id));
                void deleteAlarm(id).then(reloadAlarms);
              }}
              onCreate={(at, repeatDays, label) => {
                void createAlarm({
                  at: at.toISOString(),
                  kind: "alarm",
                  label,
                  repeatDays,
                }).then(reloadAlarms);
              }}
            />
          ) : (
            <SettingsPanel
              settings={settings}
              routines={routines}
              spotifyConnected={spotifyConnected}
              onSave={saveSettings}
              onRunRoutine={(routine) => void runRoutineNow(routine, deps)}
            />
          )}
        </Sheet>
      ) : null}
    </div>
  );
}

function StartGate({ onStart, wakeWord }: { onStart: () => void; wakeWord: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="font-display text-4xl font-bold sm:text-5xl">Home Hub</h1>
        <p className="mt-3 max-w-md text-[var(--text-secondary)]">
          Tap to start listening. Browsers need one tap before a page may use the
          microphone and speak out loud.
        </p>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="inline-flex h-20 items-center gap-4 rounded-full bg-[var(--accent-primary)] px-10 text-xl font-bold text-[var(--accent-ink)]"
      >
        <Mic className="h-7 w-7" />
        Start the hub
      </button>
      <p className="text-sm text-[var(--text-muted)]">
        Then just say “{wakeWord}”.
      </p>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-primary)]/70 text-[var(--text-secondary)] backdrop-blur transition-colors hover:text-[var(--text-primary)]"
    >
      {children}
    </button>
  );
}

function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl overflow-y-auto bg-[var(--background-secondary)] p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-secondary)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
