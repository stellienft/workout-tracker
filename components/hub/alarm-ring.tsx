"use client";

import { useEffect, useRef } from "react";
import { AlarmClock, BellOff, Clock } from "lucide-react";
import { createAlarmSound } from "@/lib/hub/alarm-sound";
import { formatClock } from "@/lib/hub/when";
import type { HubAlarm } from "@/lib/hub/types";

/**
 * Full-screen ringing overlay. Owns the chime for exactly as long as it is
 * mounted, so there is no way to leave a sound playing behind a dismissed
 * alarm — unmount stops it.
 */
export function AlarmRing({
  alarm,
  now,
  use24h,
  onDismiss,
  onSnooze,
}: {
  alarm: HubAlarm;
  now: Date;
  use24h: boolean;
  onDismiss: () => void;
  onSnooze: () => void;
}) {
  const sound = useRef<ReturnType<typeof createAlarmSound> | null>(null);

  useEffect(() => {
    const chime = createAlarmSound();
    sound.current = chime;
    chime.start();
    return () => {
      chime.stop();
      sound.current = null;
    };
  }, [alarm.id]);

  const isTimer = alarm.kind === "timer";

  return (
    <div
      role="alertdialog"
      aria-label={isTimer ? "Timer finished" : "Alarm ringing"}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-[var(--background-primary)]/95 px-6 backdrop-blur-sm"
    >
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--accent-muted)]">
        <AlarmClock className="h-14 w-14 animate-[pulse_1.2s_ease-in-out_infinite] text-[var(--accent-primary)]" />
      </div>

      <div className="text-center">
        <p className="font-display text-5xl sm:text-7xl font-bold tabular-nums">
          {formatClock(now, use24h)}
        </p>
        <p className="mt-3 text-xl sm:text-2xl text-[var(--text-secondary)]">
          {alarm.label ?? (isTimer ? "Timer finished" : "Alarm")}
        </p>
        <p className="mt-2 text-base text-[var(--text-muted)]">
          Say “stop” to dismiss, or “snooze”.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={onSnooze}
          className="inline-flex h-16 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-8 text-lg font-semibold"
        >
          <Clock className="h-5 w-5" />
          Snooze 9 min
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-16 items-center gap-3 rounded-2xl bg-[var(--accent-primary)] px-10 text-lg font-bold text-[var(--accent-ink)]"
        >
          <BellOff className="h-5 w-5" />
          Dismiss
        </button>
      </div>
    </div>
  );
}
