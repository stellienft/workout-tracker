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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(seconds);
    setTotal(seconds);
    setRunning(true);
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (haptics && "vibrate" in navigator) navigator.vibrate?.(200);
          clearInterval(intervalRef.current!);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, haptics]);

  const pct = total > 0 ? ((total - remaining) / total) * 100 : 100;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div className="pointer-events-auto rounded-2xl border border-[var(--border-active)] bg-[var(--surface-elevated)] p-3 shadow-lg">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setRunning((r) => !r)}
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
              onClick={() => {
                setRemaining((r) => r + 15);
                setTotal((t) => t + 15);
              }}
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
