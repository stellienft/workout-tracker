"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startWorkout } from "@/lib/actions/workout";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

/**
 * Starts (or resumes) a workout. Before a fresh start it collects a quick
 * pre-workout check-in — shoulder pain 0–10, energy and readiness — which
 * drives the in-session safety alerts.
 */
export function StartWorkoutButton({
  workoutTemplateId,
  existingSessionId,
  className,
}: {
  workoutTemplateId: string;
  existingSessionId: string | null;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [shoulder, setShoulder] = useState(0);
  const [energy, setEnergy] = useState(3);
  const [readiness, setReadiness] = useState(3);

  function go() {
    startTransition(async () => {
      const res = await startWorkout({
        workoutTemplateId,
        preShoulderPain: shoulder,
        preEnergy: energy,
        preReadiness: readiness,
      });
      if (res.ok && res.sessionId) {
        router.push(`/workout/${res.sessionId}`);
      }
    });
  }

  if (existingSessionId) {
    return (
      <Button
        onClick={() => router.push(`/workout/${existingSessionId}`)}
        className={className}
      >
        <Play className="h-4 w-4" /> Continue Workout
      </Button>
    );
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className={className}>
        <Play className="h-4 w-4" /> Start Workout
      </Button>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6">
            <h3 className="text-lg font-bold">Quick check-in</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Two seconds before you lift — this keeps your shoulder safe.
            </p>

            <Scale
              label="Left shoulder pain"
              value={shoulder}
              min={0}
              max={10}
              onChange={setShoulder}
              hint={
                shoulder >= 5
                  ? "That's high — we'll suggest gentler substitutes today."
                  : shoulder >= 3
                    ? "We'll flag pressing moves to watch."
                    : "Good to go."
              }
              danger={shoulder >= 5}
            />
            <Scale label="Energy" value={energy} min={1} max={5} onChange={setEnergy} />
            <Scale
              label="Readiness"
              value={readiness}
              min={1}
              max={5}
              onChange={setReadiness}
            />

            <div className="mt-5 flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={go} disabled={pending} className="flex-1">
                {pending ? "Starting…" : "Start"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Scale({
  label,
  value,
  min,
  max,
  onChange,
  hint,
  danger,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  hint?: string;
  danger?: boolean;
}) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span
          className={
            danger ? "text-sm font-bold text-[var(--danger)]" : "text-sm font-bold"
          }
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-[var(--accent-primary)]"
      />
      {hint && (
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</p>
      )}
    </div>
  );
}
