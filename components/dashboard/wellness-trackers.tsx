"use client";

import { useState, useTransition } from "react";
import { Droplet, Moon, Plus, Minus } from "lucide-react";
import { addWater, logSleep } from "@/lib/actions/wellness";
import { WATER_GOAL_ML, CUP_ML, BOTTLE_ML } from "@/lib/wellness";

export function WellnessTrackers({
  date,
  initialWaterMl,
  initialSleepHours,
}: {
  date: string; // local YYYY-MM-DD
  initialWaterMl: number;
  initialSleepHours: number | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <WaterCard date={date} initial={initialWaterMl} />
      <SleepCard date={date} initial={initialSleepHours} />
    </div>
  );
}

function WaterCard({ date, initial }: { date: string; initial: number }) {
  const [ml, setMl] = useState(initial);
  const [pending, start] = useTransition();
  const pct = Math.min(100, Math.round((ml / WATER_GOAL_ML) * 100));

  function change(delta: number) {
    // Optimistic — snap back if the server disagrees.
    setMl((cur) => Math.max(0, cur + delta));
    start(async () => {
      const res = await addWater({ date, deltaMl: delta });
      if (res.ok) setMl(res.waterMl);
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Droplet className="h-4 w-4 text-[var(--accent-primary)]" /> Water
        </p>
        <button
          onClick={() => change(-CUP_ML)}
          disabled={pending || ml === 0}
          aria-label="Remove a cup"
          className="text-[var(--text-muted)] disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
      </div>

      <p className="mt-1.5 text-xs text-[var(--text-muted)]">
        {(ml / 1000).toFixed(2)} / {(WATER_GOAL_ML / 1000).toFixed(1)} L
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
        <div
          className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2.5 flex items-center gap-1.5">
        <button
          onClick={() => change(CUP_ML)}
          disabled={pending}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-[var(--accent-primary)] py-1.5 text-xs font-semibold text-[var(--accent-ink)] disabled:opacity-60"
        >
          <Plus className="h-3 w-3" /> {CUP_ML}
        </button>
        <button
          onClick={() => change(BOTTLE_ML)}
          disabled={pending}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border-subtle)] py-1.5 text-xs font-semibold text-[var(--text-secondary)] disabled:opacity-60"
        >
          <Plus className="h-3 w-3" /> {BOTTLE_ML}
        </button>
      </div>
    </div>
  );
}

function SleepCard({ date, initial }: { date: string; initial: number | null }) {
  const [hours, setHours] = useState<number | null>(initial);
  const [draft, setDraft] = useState(initial != null ? String(initial) : "");
  const [editing, setEditing] = useState(initial == null);
  const [pending, start] = useTransition();

  function save() {
    const h = Number(draft);
    if (isNaN(h) || h < 0 || h > 24) return;
    start(async () => {
      const res = await logSleep({ date, hours: h });
      if (res.ok) {
        setHours(h);
        setEditing(false);
      }
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Moon className="h-4 w-4 text-[var(--accent-primary)]" /> Sleep
        </p>
        {!editing && hours != null && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-[var(--accent-primary)]"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2 flex items-center gap-1.5">
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            max={24}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="7.5"
            className="h-9 w-full min-w-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2.5 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <button
            onClick={save}
            disabled={pending || draft === ""}
            className="shrink-0 rounded-lg bg-[var(--accent-primary)] px-3 py-2 text-xs font-semibold text-[var(--accent-ink)] disabled:opacity-60"
          >
            {pending ? "…" : "Save"}
          </button>
        </div>
      ) : (
        <p className="mt-2 text-2xl font-bold">
          {hours}
          <span className="ml-1 text-xs font-medium text-[var(--text-muted)]">
            hrs last night
          </span>
        </p>
      )}
      {editing && (
        <p className="mt-1.5 text-[10px] text-[var(--text-muted)]">hours last night</p>
      )}
    </div>
  );
}
