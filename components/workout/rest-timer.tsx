"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, X, Plus, Volume2, VolumeX } from "lucide-react";

const SOUND_KEY = "stellio-rest-sound";

/** Sound is on unless the member has explicitly turned it off (per-device). */
function getSoundPref(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

// A single shared AudioContext, unlocked by the first user gesture (starting a
// rest). Beeps are synthesised — no audio files to host or fall foul of the
// PWA's content-security policy.
let sharedCtx: AudioContext | null = null;
function playBeep(freq: number, durMs: number) {
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    if (!sharedCtx) sharedCtx = new AC();
    const ctx = sharedCtx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + durMs / 1000 + 0.03);
  } catch {
    // Audio unavailable — the on-screen timer and vibration still work.
  }
}

/**
 * When rest ends, surface a notification if the member has left the app (screen
 * off or switched away) so they know to start the next set. We only notify when
 * the page is hidden — if they're looking at the timer, the on-screen countdown
 * and vibration are enough. Best-effort: requires notification permission
 * (granted via Settings) and depends on the browser still running our JS.
 */
function notifyRestOver() {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted")
      return;
    if (typeof document !== "undefined" && document.visibilityState === "visible")
      return;
    navigator.serviceWorker?.ready
      .then((reg) =>
        reg.showNotification("Rest complete 💪", {
          body: "Time for your next set.",
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: "stellio-rest",
          data: { url: window.location.pathname },
          // vibrate is valid on mobile but absent from the TS type.
          ...({ vibrate: [120, 40, 120], renotify: true } as object),
        })
      )
      .catch(() => {});
  } catch {
    // Notifications unavailable — the on-screen timer still fired.
  }
}

/**
 * Persistent rest timer. Stays mounted at the bottom of workout mode so it
 * keeps ticking while the user navigates between exercises.
 */
export function RestTimer({
  seconds,
  onClose,
  haptics,
}: {
  seconds: number;
  onClose: () => void;
  haptics?: boolean;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  const [total, setTotal] = useState(seconds);
  const [soundOn, setSoundOn] = useState(true);
  // Mirror sound state in a ref so the tick/fire closures always read the
  // latest value without re-arming the interval.
  const soundOnRef = useRef(true);
  // Tracks which countdown second we last beeped for, so each of the final
  // 3-2-1 seconds dings exactly once.
  const lastBeepSecRef = useRef<number | null>(null);
  // Absolute time the rest ends. Computing remaining from this (rather than
  // decrementing a counter) keeps the countdown accurate when the app is
  // backgrounded — mobile browsers suspend setInterval while you're in another
  // app, so a counter would freeze. We also resync on return to foreground.
  const endAtRef = useRef<number>(Date.now() + seconds * 1000);
  const firedRef = useRef(false);
  const tokenRef = useRef<string | null>(null);

  const pushReady = () =>
    typeof Notification !== "undefined" && Notification.permission === "granted";

  // Ask the server to deliver a "rest complete" push at the end time. This is
  // what makes the notification reliable once an iOS PWA freezes its JS — the
  // send happens server-side, independent of this tab being alive.
  const scheduleServerPush = useCallback((restSeconds: number) => {
    if (!pushReady() || restSeconds <= 0) return;
    fetch("/api/rest-timer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ restSeconds, url: window.location.pathname }),
      keepalive: true,
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.token) tokenRef.current = d.token;
      })
      .catch(() => {});
  }, []);

  const cancelServerPush = useCallback(() => {
    if (!pushReady()) return;
    fetch("/api/rest-timer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cancel: true, token: tokenRef.current }),
      keepalive: true,
    }).catch(() => {});
    tokenRef.current = null;
  }, []);

  // A new rest starts (component is keyed per rest, so this is effectively a
  // mount): reset the clock and schedule the server push; cancel it on unmount.
  useEffect(() => {
    setRemaining(seconds);
    setTotal(seconds);
    setRunning(true);
    endAtRef.current = Date.now() + seconds * 1000;
    firedRef.current = false;
    lastBeepSecRef.current = null;
    const on = getSoundPref();
    soundOnRef.current = on;
    setSoundOn(on);
    // A short "go" ding as the rest begins. Also unlocks the AudioContext via
    // the tap that started the rest, so the later countdown beeps are allowed.
    if (on) playBeep(660, 150);
    scheduleServerPush(seconds);
    return () => cancelServerPush();
  }, [seconds, scheduleServerPush, cancelServerPush]);

  useEffect(() => {
    if (!running) return;
    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      if (haptics && "vibrate" in navigator) navigator.vibrate?.(200);
      // Final, higher "time's up" tone.
      if (soundOnRef.current) playBeep(1046, 260);
      // If they're looking at the app when rest ends, the on-screen timer +
      // vibration are enough — cancel the queued server push so it can't arrive
      // as a duplicate a moment later. When hidden, we leave it to fire.
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        cancelServerPush();
      } else {
        notifyRestOver();
      }
    };
    const tick = () => {
      const rem = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(rem);
      // 3-2-1 countdown: one ding per second for the last three seconds so the
      // member knows rest is about to end.
      if (soundOnRef.current && rem >= 1 && rem <= 3) {
        if (lastBeepSecRef.current !== rem) {
          lastBeepSecRef.current = rem;
          playBeep(880, 130);
        }
      } else if (rem > 3) {
        lastBeepSecRef.current = null;
      }
      if (rem <= 0) fire();
    };
    tick(); // sync immediately
    const id = setInterval(tick, 500);
    // A wall-clock timeout as well, so the notification can still fire while the
    // app is briefly backgrounded (when the throttled interval may not run).
    const to = setTimeout(fire, Math.max(0, endAtRef.current - Date.now()) + 50);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      clearTimeout(to);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // `total` is included so adding +15s re-arms the wall-clock timeout.
  }, [running, haptics, total, cancelServerPush]);

  function toggleRunning() {
    setRunning((r) => {
      const next = !r;
      if (next) {
        // Resuming: rebuild the deadline and re-schedule the server push.
        endAtRef.current = Date.now() + remaining * 1000;
        scheduleServerPush(remaining);
      } else {
        // Paused — no fixed end time, so cancel the queued push.
        cancelServerPush();
      }
      return next;
    });
  }

  function addFifteen() {
    endAtRef.current += 15000;
    firedRef.current = false;
    setTotal((t) => t + 15);
    setRemaining((r) => r + 15);
    // Push the server reminder out to the new end time (supersedes the old one).
    scheduleServerPush(Math.round((endAtRef.current - Date.now()) / 1000));
  }

  function toggleSound() {
    setSoundOn((on) => {
      const next = !on;
      soundOnRef.current = next;
      try {
        localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      } catch {
        // Preference is best-effort; sound still toggles for this session.
      }
      // A tiny confirmation ding when turning it back on.
      if (next) playBeep(880, 120);
      return next;
    });
  }

  function handleClose() {
    cancelServerPush();
    onClose();
  }

  const pct = total > 0 ? ((total - remaining) / total) * 100 : 100;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div className="pointer-events-auto rounded-2xl border border-[var(--border-active)] bg-[var(--accent-muted)] px-4 py-3 shadow-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleRunning}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--accent-ink)]"
          aria-label={running ? "Pause timer" : "Resume timer"}
        >
          {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent-primary)]">
                Rest
              </span>
              <span className="font-mono text-3xl font-extrabold tabular-nums leading-none">
                {remaining > 0 ? `${m}:${s.toString().padStart(2, "0")}` : "0:00"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleSound}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                aria-label={soundOn ? "Mute rest sounds" : "Unmute rest sounds"}
                aria-pressed={soundOn}
              >
                {soundOn ? (
                  <Volume2 className="h-3.5 w-3.5" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={addFifteen}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
              >
                <Plus className="h-3 w-3" /> 15s
              </button>
            </div>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
            <div
              className="h-full bg-[var(--accent-primary)] transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          onClick={handleClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-secondary)]"
          aria-label="Dismiss timer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
