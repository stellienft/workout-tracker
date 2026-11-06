"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Check } from "lucide-react";
import { logSet, deleteSetLog } from "@/lib/actions/workout";

interface EditSet {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  durationSeconds: number | null;
}
export interface EditExercise {
  exerciseId: string;
  name: string;
  isBodyweight: boolean;
  sets: EditSet[];
}

export function EditWorkout({
  sessionId,
  exercises,
  returnHref,
}: {
  sessionId: string;
  exercises: EditExercise[];
  returnHref: string;
}) {
  const router = useRouter();
  const [list, setList] = useState<EditExercise[]>(exercises);
  const [, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<number>(0);

  function save(exerciseId: string, s: EditSet) {
    startTransition(async () => {
      await logSet({
        sessionId,
        exerciseId,
        setNumber: s.setNumber,
        weightKg: s.weightKg ?? undefined,
        reps: s.reps ?? undefined,
        durationSeconds: s.durationSeconds ?? undefined,
        completed: true,
      });
      setSavedAt(Date.now());
      router.refresh();
    });
  }

  function patch(exId: string, idx: number, field: keyof EditSet, raw: string) {
    setList((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exId) return ex;
        const sets = ex.sets.slice();
        const v = raw === "" ? null : Number(raw);
        sets[idx] = { ...sets[idx], [field]: Number.isNaN(v as number) ? null : v };
        return { ...ex, sets };
      }),
    );
  }

  function addSet(exId: string) {
    setList((prev) =>
      prev.map((ex) => {
        if (ex.exerciseId !== exId) return ex;
        const nextNum = ex.sets.reduce((m, s) => Math.max(m, s.setNumber), 0) + 1;
        return {
          ...ex,
          sets: [...ex.sets, { setNumber: nextNum, weightKg: null, reps: null, durationSeconds: null }],
        };
      }),
    );
  }

  function removeSet(exId: string, setNumber: number) {
    setList((prev) =>
      prev.map((ex) =>
        ex.exerciseId === exId
          ? { ...ex, sets: ex.sets.filter((s) => s.setNumber !== setNumber) }
          : ex,
      ),
    );
    startTransition(async () => {
      await deleteSetLog({ sessionId, exerciseId: exId, setNumber });
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {list.map((ex) => (
        <div
          key={ex.exerciseId}
          className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
        >
          <h3 className="font-semibold">{ex.name}</h3>
          <div className="mt-3 space-y-2">
            {ex.sets.map((s, idx) => {
              const isTime = s.durationSeconds != null && s.reps == null;
              return (
                <div key={s.setNumber} className="flex items-center gap-2">
                  <span className="w-6 shrink-0 text-xs font-medium text-[var(--text-muted)]">
                    {idx + 1}
                  </span>
                  {!ex.isBodyweight && (
                    <label className="flex flex-1 items-center gap-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        defaultValue={s.weightKg ?? ""}
                        onBlur={(e) => {
                          patch(ex.exerciseId, idx, "weightKg", e.target.value);
                          save(ex.exerciseId, {
                            ...s,
                            weightKg: e.target.value === "" ? null : Number(e.target.value),
                          });
                        }}
                        placeholder="kg"
                        className="h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
                      />
                      <span className="text-xs text-[var(--text-muted)]">kg</span>
                    </label>
                  )}
                  <label className="flex flex-1 items-center gap-1">
                    <input
                      type="number"
                      inputMode="numeric"
                      defaultValue={(isTime ? s.durationSeconds : s.reps) ?? ""}
                      onBlur={(e) => {
                        const field = isTime ? "durationSeconds" : "reps";
                        patch(ex.exerciseId, idx, field, e.target.value);
                        save(ex.exerciseId, {
                          ...s,
                          [field]: e.target.value === "" ? null : Number(e.target.value),
                        } as EditSet);
                      }}
                      placeholder={isTime ? "sec" : "reps"}
                      className="h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
                    />
                    <span className="text-xs text-[var(--text-muted)]">
                      {isTime ? "sec" : "reps"}
                    </span>
                  </label>
                  <button
                    onClick={() => removeSet(ex.exerciseId, s.setNumber)}
                    aria-label="Delete set"
                    className="-m-1 shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--warning)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => addSet(ex.exerciseId)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
          >
            <Plus className="h-4 w-4" /> Add set
          </button>
        </div>
      ))}

      {list.length === 0 && (
        <p className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] py-12 text-center text-sm text-[var(--text-muted)]">
          No sets logged for this workout.
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-[var(--text-muted)]">
          {savedAt ? "Saved ✓" : "Changes save automatically"}
        </span>
        <Link
          href={returnHref}
          className="inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-6 py-3 font-bold text-[var(--accent-ink)]"
        >
          <Check className="h-5 w-5" /> Done
        </Link>
      </div>
    </div>
  );
}
