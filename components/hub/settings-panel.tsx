"use client";

import { useEffect, useState } from "react";
import { MapPin, Play, RefreshCw, Speaker } from "lucide-react";
import { loadVoices, speak } from "@/lib/hub/tts";
import type { HubRoutine, HubSettings } from "@/lib/hub/types";

interface Device {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
}

/**
 * Hub configuration. Everything here is per-member and saved server-side, so a
 * factory-reset tablet picks its setup back up as soon as it signs in.
 */
export function SettingsPanel({
  settings,
  routines,
  spotifyConnected,
  onSave,
  onRunRoutine,
}: {
  settings: HubSettings;
  routines: HubRoutine[];
  spotifyConnected: boolean;
  onSave: (patch: Partial<HubSettings>) => void;
  onRunRoutine: (routine: HubRoutine) => void;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [place, setPlace] = useState(settings.placeLabel ?? "");
  const [placeStatus, setPlaceStatus] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    loadVoices().then(setVoices);
  }, []);

  const findPlace = async () => {
    if (!place.trim()) return;
    setPlaceStatus("Searching…");
    try {
      const res = await fetch(`/api/hub/geocode?q=${encodeURIComponent(place)}`);
      const data = (await res.json()) as {
        place: { name: string; latitude: number; longitude: number } | null;
      };
      if (!data.place) {
        setPlaceStatus("Couldn't find that place.");
        return;
      }
      onSave({
        placeLabel: data.place.name,
        latitude: data.place.latitude,
        longitude: data.place.longitude,
      });
      setPlace(data.place.name);
      setPlaceStatus(`Set to ${data.place.name}.`);
    } catch {
      setPlaceStatus("Couldn't reach the lookup service.");
    }
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setPlaceStatus("This device won't share its location.");
      return;
    }
    setPlaceStatus("Locating…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSave({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          placeLabel: settings.placeLabel ?? "here",
        });
        setPlaceStatus("Using this device's location.");
      },
      () => setPlaceStatus("Location permission denied."),
      { timeout: 10_000 }
    );
  };

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await fetch("/api/spotify/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "devices" }),
      });
      const data = (await res.json()) as { devices?: Device[] };
      setDevices(data.devices ?? []);
    } catch {
      setDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <Section title="Voice">
        <Field label="Wake word">
          <input
            type="text"
            defaultValue={settings.wakeWord}
            onBlur={(e) => onSave({ wakeWord: e.target.value.trim() || "hey stellio" })}
            className="input"
          />
          <p className="hint">
            Two or three syllables work best. The hub also answers the wake word on its own.
          </p>
        </Field>

        <Toggle
          label="Always listening"
          description="Off means the hub only listens when you tap the mic."
          checked={settings.wakeEnabled}
          onChange={(v) => onSave({ wakeEnabled: v })}
        />

        <Toggle
          label="Speak confirmations"
          description="“Sure, alarm set for tomorrow at 6:14 am.”"
          checked={settings.speakConfirmations}
          onChange={(v) => onSave({ speakConfirmations: v })}
        />

        <Field label="Voice">
          <div className="flex gap-2">
            <select
              value={settings.voiceName ?? ""}
              onChange={(e) => onSave({ voiceName: e.target.value || null })}
              className="input flex-1"
            >
              <option value="">Automatic</option>
              {voices.map((v) => (
                <option key={`${v.name}-${v.lang}`} value={v.name}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                speak("Sure, alarm set for tomorrow at 6:14 am.", {
                  voiceName: settings.voiceName,
                  rate: settings.voiceRate,
                  pitch: settings.voicePitch,
                })
              }
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[var(--surface-secondary)] px-4 text-sm font-semibold"
            >
              <Play className="h-4 w-4" />
              Test
            </button>
          </div>
        </Field>

        <Field label={`Speaking rate — ${settings.voiceRate.toFixed(1)}×`}>
          <input
            type="range"
            min="0.6"
            max="1.6"
            step="0.1"
            defaultValue={settings.voiceRate}
            onChange={(e) => onSave({ voiceRate: parseFloat(e.target.value) })}
            className="w-full accent-[var(--accent-primary)]"
          />
        </Field>
      </Section>

      <Section title="Location and display">
        <Field label="Weather location">
          <div className="flex gap-2">
            <input
              type="text"
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && findPlace()}
              placeholder="Brisbane"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={findPlace}
              className="h-12 rounded-2xl bg-[var(--surface-secondary)] px-4 text-sm font-semibold"
            >
              Find
            </button>
            <button
              type="button"
              onClick={useCurrentLocation}
              aria-label="Use this device's location"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-secondary)]"
            >
              <MapPin className="h-5 w-5" />
            </button>
          </div>
          {placeStatus ? <p className="hint">{placeStatus}</p> : null}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Units">
            <select
              value={settings.units}
              onChange={(e) => onSave({ units: e.target.value as "metric" | "imperial" })}
              className="input"
            >
              <option value="metric">Celsius</option>
              <option value="imperial">Fahrenheit</option>
            </select>
          </Field>
          <Field label="Clock">
            <select
              value={settings.use24h ? "24" : "12"}
              onChange={(e) => onSave({ use24h: e.target.value === "24" })}
              className="input"
            >
              <option value="12">12-hour</option>
              <option value="24">24-hour</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Quiet hours start">
            <HourSelect
              value={settings.quietStart}
              onChange={(v) => onSave({ quietStart: v })}
            />
          </Field>
          <Field label="Quiet hours end">
            <HourSelect value={settings.quietEnd} onChange={(v) => onSave({ quietEnd: v })} />
          </Field>
        </div>

        <Toggle
          label="Dim the screen during quiet hours"
          description="Keeps the clock readable without lighting up the room."
          checked={settings.nightDim}
          onChange={(v) => onSave({ nightDim: v })}
        />

        <Field label="Your name">
          <input
            type="text"
            defaultValue={settings.displayName ?? ""}
            onBlur={(e) => onSave({ displayName: e.target.value.trim() || null })}
            placeholder="Used in greetings"
            className="input"
          />
        </Field>
      </Section>

      <Section title="Music">
        {spotifyConnected ? (
          <>
            <Field label="Playback device">
              <div className="flex gap-2">
                <select
                  value={settings.spotifyDeviceId ?? ""}
                  onChange={(e) => {
                    const device = devices.find((d) => d.id === e.target.value);
                    onSave({
                      spotifyDeviceId: e.target.value || null,
                      spotifyDeviceName: device?.name ?? null,
                    });
                  }}
                  className="input flex-1"
                >
                  <option value="">
                    {settings.spotifyDeviceName ?? "Whatever is active"}
                  </option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.type}){d.isActive ? " · active" : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={loadDevices}
                  className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[var(--surface-secondary)] px-4 text-sm font-semibold"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingDevices ? "animate-spin" : ""}`} />
                  Scan
                </button>
              </div>
              <p className="hint">
                Open the Spotify app on this tablet and play something once so it appears
                here, then pick it — that&apos;s what the hub controls.
              </p>
            </Field>
            <a
              href="/api/spotify/login?return=/hub"
              className="inline-flex items-center gap-2 text-sm text-[var(--accent-primary)] underline underline-offset-4"
            >
              <Speaker className="h-4 w-4" />
              Reconnect Spotify (needed once to grant playback control)
            </a>
          </>
        ) : (
          <a
            href="/api/spotify/login?return=/hub"
            className="inline-flex h-12 items-center gap-2 rounded-2xl bg-[#1DB954] px-5 font-semibold text-black"
          >
            <Speaker className="h-5 w-5" />
            Connect Spotify
          </a>
        )}
      </Section>

      <Section title="Routines">
        <p className="hint">Say the phrase and the hub runs the whole sequence.</p>
        <div className="space-y-3">
          {routines.map((routine) => (
            <div key={routine.id} className="card flex items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{routine.name}</p>
                <p className="truncate text-sm text-[var(--text-secondary)]">
                  “{routine.phrase}” · {routine.steps.length} steps
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRunRoutine(routine)}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--surface-secondary)] px-4 text-sm font-semibold"
              >
                <Play className="h-4 w-4" />
                Run
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}

function HourSelect({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <select
      value={value === null ? "" : String(value)}
      onChange={(e) => onChange(e.target.value === "" ? null : parseInt(e.target.value, 10))}
      className="input"
    >
      <option value="">Off</option>
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {h.toString().padStart(2, "0")}:00
        </option>
      ))}
    </select>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label}</p>
        {description ? <p className="hint">{description}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative mt-1 h-8 w-14 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-elevated)]"
        }`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
            checked ? "left-7" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
