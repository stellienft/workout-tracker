"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Ruler } from "lucide-react";
import { setHeightCm, setMetabolicReminders } from "@/lib/actions/metabolic";

export function MetabolicSettings({
  heightCm,
  remindersEnabled,
}: {
  heightCm: number | null;
  remindersEnabled: boolean;
}) {
  const router = useRouter();
  const [height, setHeight] = useState(heightCm != null ? String(heightCm) : "");
  const [on, setOn] = useState(remindersEnabled);
  const [pending, startTransition] = useTransition();

  function saveHeight() {
    const cm = height === "" ? null : Number(height);
    if (cm != null && (Number.isNaN(cm) || cm <= 50 || cm >= 260)) return;
    startTransition(async () => {
      await setHeightCm(cm);
      router.refresh();
    });
  }

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      await setMetabolicReminders(next);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Ruler className="h-4 w-4 text-[var(--accent-primary)]" />
        Height
        <input
          type="number"
          inputMode="decimal"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          onBlur={saveHeight}
          placeholder="cm"
          className="h-9 w-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
        />
        <span className="text-xs text-[var(--text-muted)]">for waist-to-height</span>
      </label>

      <button
        onClick={toggle}
        disabled={pending}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-60"
      >
        {on ? (
          <Bell className="h-4 w-4 text-[var(--accent-primary)]" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        {on ? "Reminders on" : "Reminders off"}
      </button>
    </div>
  );
}
