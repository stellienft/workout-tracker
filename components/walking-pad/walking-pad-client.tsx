"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bluetooth, Footprints, Route, Gauge, Timer, Flame, X, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { saveWalkingPadSession } from "@/lib/actions/activities";

// Standard Bluetooth Fitness Machine Service + Treadmill Data characteristic.
const FTMS = 0x1826;
const TREADMILL_DATA = 0x2acd;
const STRIDE_KEY = "stellio-stride-cm";

interface Live {
  speedKmh: number;
  distanceM: number;
  elapsedS: number;
  energyKcal: number;
}

/** Parse the FTMS Treadmill Data (0x2ACD) packet, respecting its flag field. */
function parseTreadmill(dv: DataView): Partial<Live> {
  let o = 0;
  const flags = dv.getUint16(o, true);
  o += 2;
  const r: Partial<Live> = {};
  if (!(flags & 0x0001)) {
    r.speedKmh = dv.getUint16(o, true) / 100;
    o += 2;
  } // bit0=0 → instantaneous speed present
  if (flags & 0x0002) o += 2; // average speed
  if (flags & 0x0004) {
    r.distanceM = dv.getUint16(o, true) + (dv.getUint8(o + 2) << 16);
    o += 3;
  } // total distance (uint24, metres)
  if (flags & 0x0008) o += 4; // inclination + ramp angle
  if (flags & 0x0010) o += 4; // elevation gain
  if (flags & 0x0020) o += 1; // instantaneous pace
  if (flags & 0x0040) o += 1; // average pace
  if (flags & 0x0080) {
    r.energyKcal = dv.getUint16(o, true);
    o += 5;
  } // total energy + per-hour + per-min
  if (flags & 0x0100) o += 1; // heart rate
  if (flags & 0x0200) o += 1; // metabolic equivalent
  if (flags & 0x0400) {
    r.elapsedS = dv.getUint16(o, true);
    o += 2;
  } // elapsed time
  return r;
}

function fmtTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

type Status = "idle" | "connecting" | "connected";

export function WalkingPadClient() {
  const router = useRouter();
  const toast = useToast();
  const [supported, setSupported] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<Live>({ speedKmh: 0, distanceM: 0, elapsedS: 0, energyKcal: 0 });
  const [strideCm, setStrideCm] = useState(72);
  const [saving, setSaving] = useState(false);
  const [, tick] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deviceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const charRef = useRef<any>(null);
  const startedAtRef = useRef<number | null>(null);
  const deviceElapsedRef = useRef(false); // did the pad report its own elapsed time?

  useEffect(() => {
    setSupported(typeof navigator !== "undefined" && "bluetooth" in navigator);
    try {
      const v = Number(localStorage.getItem(STRIDE_KEY));
      if (v >= 30 && v <= 120) setStrideCm(v);
    } catch {
      // ignore
    }
  }, []);

  // Tick the fallback timer once a second while connected.
  useEffect(() => {
    if (status !== "connected") return;
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  const onData = useCallback((e: Event) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dv: DataView = (e.target as any).value;
    const parsed = parseTreadmill(dv);
    if (parsed.elapsedS != null) deviceElapsedRef.current = true;
    setLive((cur) => ({
      speedKmh: parsed.speedKmh ?? cur.speedKmh,
      distanceM: parsed.distanceM ?? cur.distanceM,
      elapsedS: parsed.elapsedS ?? cur.elapsedS,
      energyKcal: parsed.energyKcal ?? cur.energyKcal,
    }));
  }, []);

  const onDisconnected = useCallback(() => {
    setStatus("idle");
  }, []);

  async function connect() {
    setError(null);
    setStatus("connecting");
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bt = (navigator as any).bluetooth;
      const device = await bt.requestDevice({
        filters: [{ services: [FTMS] }],
        optionalServices: [FTMS],
      });
      deviceRef.current = device;
      device.addEventListener("gattserverdisconnected", onDisconnected);
      const server = await device.gatt.connect();
      const svc = await server.getPrimaryService(FTMS);
      const ch = await svc.getCharacteristic(TREADMILL_DATA);
      charRef.current = ch;
      await ch.startNotifications();
      ch.addEventListener("characteristicvaluechanged", onData);
      startedAtRef.current = Date.now();
      deviceElapsedRef.current = false;
      setStatus("connected");
    } catch (err) {
      setStatus("idle");
      const name = (err as { name?: string })?.name;
      setError(
        name === "NotFoundError"
          ? "No walking pad selected."
          : name === "NotSupportedError"
            ? "This device doesn't broadcast treadmill data (FTMS)."
            : "Couldn't connect. Make sure the pad is on, nearby and not linked to another app."
      );
    }
  }

  function disconnect() {
    try {
      charRef.current?.stopNotifications?.().catch(() => {});
      deviceRef.current?.gatt?.disconnect?.();
    } catch {
      // ignore
    }
    setStatus("idle");
  }

  useEffect(() => {
    return () => {
      try {
        deviceRef.current?.gatt?.disconnect?.();
      } catch {
        // ignore
      }
    };
  }, []);

  const elapsed =
    deviceElapsedRef.current && live.elapsedS > 0
      ? live.elapsedS
      : status === "connected" && startedAtRef.current
        ? Math.floor((Date.now() - startedAtRef.current) / 1000)
        : live.elapsedS;
  const steps = strideCm > 0 ? Math.round(live.distanceM / (strideCm / 100)) : 0;
  const hasData = live.distanceM > 0 || steps > 0;

  function setStride(v: number) {
    setStrideCm(v);
    try {
      localStorage.setItem(STRIDE_KEY, String(v));
    } catch {
      // ignore
    }
  }

  function save() {
    setSaving(true);
    saveWalkingPadSession({
      steps,
      distanceM: Math.round(live.distanceM),
      movingSeconds: elapsed,
      calories: Math.round(live.energyKcal),
    }).then((res) => {
      setSaving(false);
      if (res.ok) {
        toast("Walk saved to your activities.", "success");
        setLive({ speedKmh: 0, distanceM: 0, elapsedS: 0, energyKcal: 0 });
        startedAtRef.current = status === "connected" ? Date.now() : null;
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't save", "error");
      }
    });
  }

  return (
    <div className="mt-6 space-y-4">
      {!supported && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <p className="flex items-center gap-2 font-semibold">
            <Bluetooth className="h-4 w-4 text-[var(--text-muted)]" /> Live Bluetooth
            connect isn&apos;t available here
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            iPhones and iPads don&apos;t allow Web Bluetooth, so live pairing only works in
            Chrome or Edge on Android/desktop. You can still log your walk below — just read
            the totals off your pad&apos;s display when you&apos;re done.
          </p>
        </div>
      )}

      {supported && (
        <>
          {/* Live step counter */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6 text-center">
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          <Footprints className="h-3.5 w-3.5" /> Steps
        </p>
        <p className="mt-1 font-mono text-6xl font-extrabold tabular-nums">
          {steps.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {status === "connected" ? (
            <span className="text-[var(--accent-primary)]">● Connected</span>
          ) : status === "connecting" ? (
            "Connecting…"
          ) : (
            "Not connected"
          )}
        </p>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Route className="h-4 w-4" />} label="Distance" value={`${(live.distanceM / 1000).toFixed(2)}`} unit="km" />
        <Stat icon={<Timer className="h-4 w-4" />} label="Time" value={fmtTime(elapsed)} />
        <Stat icon={<Gauge className="h-4 w-4" />} label="Speed" value={live.speedKmh.toFixed(1)} unit="km/h" />
        <Stat icon={<Flame className="h-4 w-4" />} label="Calories" value={String(Math.round(live.energyKcal))} unit="kcal" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {status === "connected" ? (
          <button
            onClick={disconnect}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-semibold text-[var(--text-secondary)]"
          >
            <X className="h-4 w-4" /> Disconnect
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={status === "connecting"}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
          >
            <Bluetooth className="h-4 w-4" />
            {status === "connecting" ? "Connecting…" : "Connect walking pad"}
          </button>
        )}
        <button
          onClick={save}
          disabled={saving || !hasData}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save walk"}
        </button>
      </div>

      {error && <p className="text-sm text-[var(--warning)]">{error}</p>}

      {/* Stride length → steps estimate */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
        <label className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="font-medium">Step length</span>
          <span className="flex items-center gap-2">
            <input
              type="number"
              min={30}
              max={120}
              value={strideCm}
              onChange={(e) => setStride(Number(e.target.value) || 0)}
              className="h-10 w-20 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-center text-sm"
            />
            <span className="text-[var(--text-muted)]">cm</span>
          </span>
        </label>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Steps are estimated from distance ÷ step length (most walking pads don&apos;t
          report steps directly). Tweak this to match your stride for a closer count.
        </p>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Works with Bluetooth walking pads &amp; treadmills that support the standard
        fitness-machine profile (FTMS). Keep this screen open while you walk.
      </p>
        </>
      )}

      <ManualLog />
    </div>
  );
}

/** Universal fallback: type in a walk from the pad's display. Works everywhere. */
function ManualLog() {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState("");
  const [km, setKm] = useState("");
  const [mins, setMins] = useState("");
  const [kcal, setKcal] = useState("");

  function save() {
    const s = Number(steps) || 0;
    const distanceM = Math.round((Number(km) || 0) * 1000);
    if (s <= 0 && distanceM <= 0) {
      toast("Enter your steps or distance.", "error");
      return;
    }
    setSaving(true);
    saveWalkingPadSession({
      steps: s,
      distanceM,
      movingSeconds: Math.round((Number(mins) || 0) * 60),
      calories: Math.round(Number(kcal) || 0),
    }).then((res) => {
      setSaving(false);
      if (res.ok) {
        toast("Walk saved to your activities.", "success");
        setSteps("");
        setKm("");
        setMins("");
        setKcal("");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't save", "error");
      }
    });
  }

  const fields: [string, string, string, (v: string) => void, string][] = [
    ["Steps", steps, "e.g. 3200", setSteps, ""],
    ["Distance", km, "e.g. 2.4", setKm, "km"],
    ["Time", mins, "e.g. 30", setMins, "min"],
    ["Calories", kcal, "e.g. 120", setKcal, "kcal"],
  ];

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <h2 className="text-lg font-bold">Log a walk</h2>
      <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
        Read the totals off your pad&apos;s display and enter them here.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {fields.map(([label, val, ph, setter, unit]) => (
          <label key={label} className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
            {label}
            {unit ? <span className="sr-only">{unit}</span> : null}
            <span className="relative">
              <input
                type="number"
                inputMode="decimal"
                value={val}
                onChange={(e) => setter(e.target.value)}
                placeholder={ph}
                className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)] focus:border-[var(--border-active)] focus:outline-none"
              />
              {unit ? (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                  {unit}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)] disabled:opacity-60"
      >
        <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save walk"}
      </button>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-center">
      <p className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {icon} {label}
      </p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums">
        {value}
        {unit ? <span className="ml-0.5 text-xs font-medium text-[var(--text-muted)]">{unit}</span> : null}
      </p>
    </div>
  );
}
