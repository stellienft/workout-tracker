"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatClock, formatWhen } from "@/lib/hub/when";
import { describeRepeat, effectiveFireAt } from "@/lib/hub/alarms";
import type { HubAlarm } from "@/lib/hub/types";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Manual alarm management. Voice is the point of the hub, but an alarm you
 * can't see or turn off by hand is a bad alarm.
 */
export function AlarmsPanel({
  alarms,
  now,
  use24h,
  onToggle,
  onDelete,
  onCreate,
}: {
  alarms: HubAlarm[];
  now: Date;
  use24h: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onCreate: (at: Date, repeatDays: number[] | null, label: string | null) => void;
}) {
  const [time, setTime] = useState("06:30");
  const [label, setLabel] = useState("");
  const [days, setDays] = useState<number[]>([]);

  const sorted = [...alarms].sort(
    (a, b) => effectiveFireAt(a).getTime() - effectiveFireAt(b).getTime()
  );

  const add = () => {
    const [h, m] = time.split(":").map((n) => parseInt(n, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return;
    const at = new Date(now);
    at.setHours(h, m, 0, 0);
    // A time already gone today means tomorrow, unless it repeats.
    if (at.getTime() <= now.getTime() && days.length === 0) {
      at.setDate(at.getDate() + 1);
    }
    onCreate(at, days.length > 0 ? [...days].sort() : null, label.trim() || null);
    setLabel("");
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <p className="mb-4 font-display text-lg font-semibold">New alarm</p>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-14 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 text-2xl tabular-nums"
          />
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label (optional)"
            className="h-14 min-w-[12rem] flex-1 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4"
          />
          <button
            type="button"
            onClick={add}
            className="inline-flex h-14 items-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-6 font-semibold text-[var(--accent-ink)]"
          >
            <Plus className="h-5 w-5" />
            Add
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          {DAYS.map((d, index) => {
            const on = days.includes(index);
            return (
              <button
                key={index}
                type="button"
                aria-label={`Repeat on day ${index}`}
                aria-pressed={on}
                onClick={() =>
                  setDays((prev) =>
                    prev.includes(index) ? prev.filter((x) => x !== index) : [...prev, index]
                  )
                }
                className={`h-11 w-11 rounded-full text-sm font-semibold transition-colors ${
                  on
                    ? "bg-[var(--accent-primary)] text-[var(--accent-ink)]"
                    : "bg-[var(--surface-secondary)] text-[var(--text-secondary)]"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        {sorted.length === 0 ? (
          <p className="text-[var(--text-muted)]">
            No alarms yet. Try saying “set an alarm for 6:14 tomorrow morning”.
          </p>
        ) : (
          sorted.map((alarm) => {
            const at = effectiveFireAt(alarm);
            const repeat = describeRepeat(alarm.repeatDays);
            return (
              <div
                key={alarm.id}
                className="card flex items-center gap-4 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display text-2xl font-semibold tabular-nums">
                    {formatClock(at, use24h)}
                  </p>
                  <p className="truncate text-sm text-[var(--text-secondary)]">
                    {repeat ?? formatWhen(at, now, use24h)}
                    {alarm.label ? ` · ${alarm.label}` : ""}
                    {alarm.kind === "timer" ? " · timer" : ""}
                    {alarm.snoozedUntil ? " · snoozed" : ""}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={alarm.enabled}
                  aria-label={alarm.enabled ? "Disable alarm" : "Enable alarm"}
                  onClick={() => onToggle(alarm.id, !alarm.enabled)}
                  className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                    alarm.enabled ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-elevated)]"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${
                      alarm.enabled ? "left-7" : "left-1"
                    }`}
                  />
                </button>

                <button
                  type="button"
                  aria-label="Delete alarm"
                  onClick={() => onDelete(alarm.id)}
                  className="shrink-0 rounded-xl p-2.5 text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
