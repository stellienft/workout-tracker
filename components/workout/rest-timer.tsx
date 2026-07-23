"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, X, Plus } from "lucide-react";

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
  // Absolute time the rest ends. Computing remaining from this (rather than
  // decrementing a counter) keeps the countdown accurate when the app is
  // backgrounded — mobile browsers suspend setInterval while you're in another
  // app, so a counter would freeze. We also resync on return to foreground.
  const endAtRef = useRef<number>(Date.now() + seconds * 1000);
  const firedRef = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    setTotal(seconds);
    setRunning(true);
    endAtRef.current = Date.now() + seconds * 1000;
    firedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const rem = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(rem);
      if (rem <= 0 && !firedRef.current) {
        firedRef.current = true;
        if (haptics && "vibrate" in navigator) navigator.vibrate?.(200);
      }
    };
    tick(); // sync immediately
    const id = setInterval(tick, 500);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [running, haptics]);

  function toggleRunning() {
    setRunning((r) => {
      const next = !r;
      // Resuming: rebuild the deadline from whatever time is left.
      if (next) endAtRef.current = Date.now() + remaining * 1000;
      return next;
    });
  }

  function addFifteen() {
    endAtRef.current += 15000;
    firedRef.current = false;
    setTotal((t) => t + 15);
    setRemaining((r) => r + 15);
  }

  const pct = total > 0 ? ((total - remaining) / total) * 100 : 100;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div className="pointer-events-auto rounded-2xl border border-[var(--border-active)] bg-[var(--surface-elevated)] p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleRunning}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-primary)] text-black"
          aria-label={running ? "Pause timer" : "Resume timer"}
        >
          {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">
              Rest {remaining > 0 ? `${m}:${s.toString().padStart(2, "0")}` : "done"}
            </span>
            <button
              onClick={addFifteen}
              className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)]"
            >
              <Plus className="h-3 w-3" /> 15s
            </button>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
            <div
              className="h-full bg-[var(--accent-primary)] transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)]"
          aria-label="Dismiss timer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
