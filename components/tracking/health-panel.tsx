"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  enableTracker,
  disableTracker,
  addCustomTracker,
  logHealthValue,
} from "@/lib/actions/health";
import type { Tracker, HealthMetricDef } from "@/lib/health";
import { cn } from "@/lib/utils";
import { Check, Plus, Sliders, Settings2 } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  symptom: "Symptoms",
  wellbeing: "Wellbeing",
  vital: "Vitals",
  lifestyle: "Lifestyle",
};

export function HealthPanel({
  trackers,
  catalog,
  enabledMetricIds,
}: {
  trackers: Tracker[];
  catalog: HealthMetricDef[];
  enabledMetricIds: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [managing, setManaging] = useState(trackers.length === 0);

  // Local optimistic values for today.
  const [values, setValues] = useState<
    Record<string, { v: number | null; b: boolean | null }>
  >(() =>
    Object.fromEntries(
      trackers.map((t) => [t.id, { v: t.todayValue, b: t.todayBool }])
    )
  );

  // Seed entries for trackers that appear after a refresh (e.g. just enabled),
  // so rows never read from an undefined value.
  useEffect(() => {
    setValues((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const t of trackers) {
        if (!(t.id in next)) {
          next[t.id] = { v: t.todayValue, b: t.todayBool };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [trackers]);

  const enabledSet = useMemo(() => new Set(enabledMetricIds), [enabledMetricIds]);
  const trackerByMetric = useMemo(
    () => new Map(trackers.filter((t) => t.metricId).map((t) => [t.metricId!, t.id])),
    [trackers]
  );

  function save(trackerId: string, patch: { v?: number | null; b?: boolean | null }) {
    setValues((prev) => ({ ...prev, [trackerId]: { ...prev[trackerId], ...patch } }));
    startTransition(async () => {
      const res = await logHealthValue({
        userHealthMetricId: trackerId,
        value: patch.v,
        bool: patch.b,
      });
      if (!res.ok) toast(res.error ?? "Could not save", "error");
    });
  }

  return (
    <div>
      {/* Today's quick-log */}
      {trackers.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Today</h2>
            <button
              onClick={() => setManaging((m) => !m)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-sm text-[var(--text-secondary)]"
            >
              <Settings2 className="h-4 w-4" /> Manage
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {trackers.map((t) => (
              <TrackerRow
                key={t.id}
                tracker={t}
                value={values[t.id] ?? { v: t.todayValue, b: t.todayBool }}
                onChange={(patch) => save(t.id, patch)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Manage which metrics are tracked */}
      {(managing || trackers.length === 0) && (
        <ManageTrackers
          catalog={catalog}
          enabledSet={enabledSet}
          trackerByMetric={trackerByMetric}
          pending={pending}
          onEnable={(metricId) =>
            startTransition(async () => {
              const res = await enableTracker(metricId);
              if (res.ok) router.refresh();
              else toast(res.error ?? "Failed", "error");
            })
          }
          onDisable={(trackerId) =>
            startTransition(async () => {
              const res = await disableTracker(trackerId);
              if (res.ok) router.refresh();
              else toast(res.error ?? "Failed", "error");
            })
          }
          onAddCustom={(input) =>
            startTransition(async () => {
              const res = await addCustomTracker(input);
              if (res.ok) {
                toast("Custom tracker added.", "success");
                router.refresh();
              } else toast(res.error ?? "Failed", "error");
            })
          }
        />
      )}
    </div>
  );
}

function TrackerRow({
  tracker,
  value,
  onChange,
}: {
  tracker: Tracker;
  value: { v: number | null; b: boolean | null };
  onChange: (patch: { v?: number | null; b?: boolean | null }) => void;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">{tracker.name}</span>
        {tracker.unit && (
          <span className="text-xs text-[var(--text-muted)]">{tracker.unit}</span>
        )}
      </div>
      <div className="mt-3">
        {tracker.inputType === "scale" && (
          <ScaleRow
            min={tracker.scaleMin}
            max={tracker.scaleMax}
            value={value.v}
            onChange={(v) => onChange({ v })}
          />
        )}
        {tracker.inputType === "number" && (
          <input
            inputMode="decimal"
            defaultValue={value.v ?? ""}
            onBlur={(e) =>
              onChange({ v: e.target.value === "" ? null : Number(e.target.value) })
            }
            placeholder={`Enter ${tracker.name.toLowerCase()}`}
            className="h-11 w-40 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
        )}
        {tracker.inputType === "boolean" && (
          <div className="flex gap-2">
            {[
              { label: "Yes", val: true },
              { label: "No", val: false },
            ].map((o) => (
              <button
                key={o.label}
                onClick={() => onChange({ b: o.val })}
                className={cn(
                  "h-10 flex-1 rounded-xl border text-sm font-medium",
                  value.b === o.val
                    ? "border-[var(--border-active)] bg-[var(--accent-primary)] text-black"
                    : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ScaleRow({
  min,
  max,
  value,
  onChange,
}: {
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  // Compact for wide ranges (0–10), buttons for small (1–5).
  if (steps.length <= 6) {
    return (
      <div className="flex gap-1.5">
        {steps.map((s) => (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={cn(
              "h-10 flex-1 rounded-xl border text-sm font-medium",
              value === s
                ? "border-[var(--border-active)] bg-[var(--accent-primary)] text-black"
                : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
            )}
          >
            {s}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
        <span>{min}</span>
        <span className="text-sm font-bold text-white">{value ?? "—"}</span>
        <span>{max}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value ?? min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[var(--accent-primary)]"
      />
    </div>
  );
}

function ManageTrackers({
  catalog,
  enabledSet,
  trackerByMetric,
  pending,
  onEnable,
  onDisable,
  onAddCustom,
}: {
  catalog: HealthMetricDef[];
  enabledSet: Set<string>;
  trackerByMetric: Map<string, string>;
  pending: boolean;
  onEnable: (metricId: string) => void;
  onDisable: (trackerId: string) => void;
  onAddCustom: (input: {
    name: string;
    inputType: "scale" | "number" | "boolean";
    unit?: string;
  }) => void;
}) {
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState<"scale" | "number" | "boolean">(
    "scale"
  );
  const [customUnit, setCustomUnit] = useState("");

  const grouped = useMemo(() => {
    const g: Record<string, HealthMetricDef[]> = {};
    for (const m of catalog) (g[m.category] ??= []).push(m);
    return g;
  }, [catalog]);

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2">
        <Sliders className="h-4 w-4 text-[var(--accent-primary)]" />
        <h2 className="text-lg font-bold">What do you want to track?</h2>
      </div>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Pick the symptoms, vitals and lifestyle factors that matter to you. Tap to
        turn each on or off — you can change this any time.
      </p>

      {Object.entries(grouped).map(([category, metrics]) => (
        <div key={category} className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            {CATEGORY_LABEL[category] ?? category}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {metrics.map((m) => {
              const on = enabledSet.has(m.id);
              return (
                <button
                  key={m.id}
                  disabled={pending}
                  onClick={() =>
                    on
                      ? onDisable(trackerByMetric.get(m.id)!)
                      : onEnable(m.id)
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    on
                      ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white"
                  )}
                >
                  {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {m.name}
                  {m.unit ? ` (${m.unit})` : ""}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Custom tracker */}
      <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
        <p className="text-sm font-semibold">Add your own</p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-secondary)]">Name</span>
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Migraine"
              className="h-11 w-44 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-[var(--text-secondary)]">Type</span>
            <select
              value={customType}
              onChange={(e) =>
                setCustomType(e.target.value as "scale" | "number" | "boolean")
              }
              className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
            >
              <option value="scale">0–10 scale</option>
              <option value="number">Number</option>
              <option value="boolean">Yes / No</option>
            </select>
          </label>
          {customType === "number" && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-secondary)]">Unit</span>
              <input
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="mg, hrs…"
                className="h-11 w-24 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
              />
            </label>
          )}
          <Button
            disabled={pending || !customName.trim()}
            onClick={() => {
              onAddCustom({
                name: customName.trim(),
                inputType: customType,
                unit: customUnit.trim() || undefined,
              });
              setCustomName("");
              setCustomUnit("");
            }}
          >
            Add
          </Button>
        </div>
      </div>
    </section>
  );
}
