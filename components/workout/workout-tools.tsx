"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLATES,
  DEFAULT_BAR,
  plateBreakdown,
  oneRepMax,
  percentTable,
  warmupSets,
  type Unit,
} from "@/lib/gym-math";

type Tab = "plates" | "onerm" | "warmup";

export function WorkoutTools({
  onClose,
  defaultWeight,
  unit: initialUnit = "kg",
}: {
  onClose: () => void;
  defaultWeight?: number | null;
  unit?: Unit;
}) {
  const [tab, setTab] = useState<Tab>("plates");
  const [unit, setUnit] = useState<Unit>(initialUnit);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-card)] bg-[var(--surface-primary)] sm:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
          <p className="font-bold">Tools</p>
          <div className="flex items-center gap-2">
            <div className="flex rounded-full bg-[var(--surface-secondary)] p-0.5 text-xs">
              {(["kg", "lb"] as Unit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => setUnit(u)}
                  className={cn(
                    "rounded-full px-2.5 py-1 font-medium",
                    unit === u
                      ? "bg-[var(--accent-primary)] text-black"
                      : "text-[var(--text-secondary)]"
                  )}
                >
                  {u}
                </button>
              ))}
            </div>
            <button onClick={onClose} aria-label="Close">
              <X className="h-5 w-5 text-[var(--text-muted)]" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 border-b border-[var(--border-subtle)] p-3">
          {(
            [
              ["plates", "Plates"],
              ["onerm", "1RM"],
              ["warmup", "Warm-up"],
            ] as [Tab, string][]
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-xl py-2 text-sm font-medium",
                tab === t
                  ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                  : "text-[var(--text-secondary)]"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto p-4">
          {tab === "plates" && <PlatesTab unit={unit} defaultWeight={defaultWeight} />}
          {tab === "onerm" && <OneRmTab unit={unit} defaultWeight={defaultWeight} />}
          {tab === "warmup" && <WarmupTab unit={unit} defaultWeight={defaultWeight} />}
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = 2.5,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
      {label}
      <input
        type="number"
        inputMode="decimal"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-base text-[var(--text-primary)] focus:border-[var(--border-active)] focus:outline-none"
      />
    </label>
  );
}

function PlatesTab({ unit, defaultWeight }: { unit: Unit; defaultWeight?: number | null }) {
  const [target, setTarget] = useState(String(defaultWeight || 60));
  const [bar, setBar] = useState(String(DEFAULT_BAR[unit]));

  const result = useMemo(() => {
    const t = Number(target) || 0;
    const b = Number(bar) || 0;
    return plateBreakdown(t, b, PLATES[unit]);
  }, [target, bar, unit]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={`Target (${unit})`} value={target} onChange={setTarget} />
        <NumberField label={`Bar (${unit})`} value={bar} onChange={setBar} />
      </div>
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4">
        <p className="text-xs text-[var(--text-muted)]">Load per side</p>
        {result.perSide.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Just the bar — no plates needed.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {result.perSide.map((p) => (
              <span
                key={p.plate}
                className="rounded-full bg-[var(--accent-muted)] px-3 py-1.5 text-sm font-semibold text-[var(--accent-primary)]"
              >
                {p.count} × {p.plate}
                {unit}
              </span>
            ))}
          </div>
        )}
        {result.leftover > 0 && (
          <p className="mt-3 text-xs text-[var(--warning)]">
            Closest loadable: {result.achievable}
            {unit} (can&apos;t make the last {result.leftover}
            {unit} with standard plates).
          </p>
        )}
      </div>
    </div>
  );
}

function OneRmTab({ unit, defaultWeight }: { unit: Unit; defaultWeight?: number | null }) {
  const [weight, setWeight] = useState(String(defaultWeight || 60));
  const [reps, setReps] = useState("5");

  const orm = useMemo(() => oneRepMax(Number(weight) || 0, Number(reps) || 0), [weight, reps]);
  const table = useMemo(() => (orm > 0 ? percentTable(orm, unit) : []), [orm, unit]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={`Weight (${unit})`} value={weight} onChange={setWeight} />
        <NumberField label="Reps" value={reps} onChange={setReps} step={1} />
      </div>
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 text-center">
        <p className="text-xs text-[var(--text-muted)]">Estimated 1RM</p>
        <p className="text-3xl font-extrabold text-[var(--accent-primary)]">
          {orm > 0 ? `${orm} ${unit}` : "—"}
        </p>
      </div>
      {table.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--surface-secondary)] text-xs text-[var(--text-muted)]">
                <th className="px-3 py-2 text-left font-medium">% 1RM</th>
                <th className="px-3 py-2 text-right font-medium">Weight</th>
                <th className="px-3 py-2 text-right font-medium">~Reps</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r) => (
                <tr key={r.pct} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-2">{r.pct}%</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {r.weight} {unit}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--text-secondary)]">{r.reps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-[var(--text-muted)]">
        Estimates use the Epley formula — a guide, not a max-out prescription.
      </p>
    </div>
  );
}

function WarmupTab({ unit, defaultWeight }: { unit: Unit; defaultWeight?: number | null }) {
  const [working, setWorking] = useState(String(defaultWeight || 60));
  const [bar, setBar] = useState(String(DEFAULT_BAR[unit]));

  const sets = useMemo(
    () => warmupSets(Number(working) || 0, Number(bar) || 0, unit),
    [working, bar, unit]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={`Working set (${unit})`} value={working} onChange={setWorking} />
        <NumberField label={`Bar (${unit})`} value={bar} onChange={setBar} />
      </div>
      <div className="space-y-2">
        {sets.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-4 py-3"
          >
            <span className="text-sm text-[var(--text-secondary)]">{s.label}</span>
            <span className="font-semibold">
              {s.weight} {unit} × {s.reps}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between rounded-2xl bg-[var(--accent-muted)] px-4 py-3">
          <span className="text-sm font-medium text-[var(--accent-primary)]">Working set</span>
          <span className="font-bold text-[var(--accent-primary)]">
            {Number(working) || 0} {unit}
          </span>
        </div>
      </div>
    </div>
  );
}
