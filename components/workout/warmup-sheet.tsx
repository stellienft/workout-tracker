"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Square, Flame, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const MODALITIES = [
  "Bike",
  "Treadmill",
  "Rower",
  "Elliptical",
  "Walk",
  "Skipping",
  "Light cardio",
] as const;

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export function WarmupSheet({
  initialType,
  initialSeconds,
  onClose,
  onSave,
}: {
  initialType: string | null;
  initialSeconds: number | null;
  onClose: () => void;
  onSave: (type: string, seconds: number) => void;
}) {
  const [type, setType] = useState<string>(initialType ?? "Bike");
  const [base, setBase] = useState<number>(initialSeconds ?? 0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef<number>(0);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => tick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [running]);

  const seconds = running
    ? base + Math.floor((Date.now() - startedAt.current) / 1000)
    : base;

  function toggle() {
    if (running) {
      setBase(seconds);
      setRunning(false);
    } else {
      startedAt.current = Date.now();
      setRunning(true);
    }
  }

  function bump(mins: number) {
    setBase((b) => Math.max(0, b + mins * 60));
  }

  return (
    <div
      className="fixed inset-0 z-[160] flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 sm:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-[var(--accent-primary)]" />
            <h3 className="text-lg font-bold">Warm up</h3>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text-muted)]" />
          </button>
        </div>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          A few minutes of light cardio before you lift. Pick how, run the timer,
          then save it to this workout.
        </p>

        {/* Modality chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {MODALITIES.map((m) => (
            <button
              key={m}
              onClick={() => setType(m)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                type === m
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
              )}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Timer */}
        <div className="mt-5 flex flex-col items-center">
          <span className="font-mono text-5xl font-extrabold tabular-nums">
            {fmt(seconds)}
          </span>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => bump(-1)}
              disabled={running}
              className="h-10 rounded-xl border border-[var(--border-subtle)] px-3 text-sm disabled:opacity-40"
            >
              −1 min
            </button>
            <button
              onClick={toggle}
              className={cn(
                "inline-flex h-12 items-center gap-2 rounded-2xl px-6 font-semibold transition-colors",
                running
                  ? "bg-[var(--surface-secondary)] text-[var(--text-primary)]"
                  : "bg-[var(--accent-primary)] text-[var(--accent-ink)]"
              )}
            >
              {running ? (
                <>
                  <Square className="h-4 w-4" /> Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" /> {seconds > 0 ? "Resume" : "Start"}
                </>
              )}
            </button>
            <button
              onClick={() => bump(1)}
              disabled={running}
              className="h-10 rounded-xl border border-[var(--border-subtle)] px-3 text-sm disabled:opacity-40"
            >
              +1 min
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            if (running) setRunning(false);
            onSave(type, seconds);
          }}
          disabled={seconds <= 0}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] py-3.5 font-bold text-[var(--accent-ink)] disabled:opacity-40"
        >
          <Check className="h-5 w-5" /> Save warm-up
        </button>
      </div>
    </div>
  );
}
