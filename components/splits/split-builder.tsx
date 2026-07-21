"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Play,
  Search,
  X,
  Dumbbell,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import {
  addSplitDay,
  deleteSplitDay,
  addExerciseToSplitDay,
  removeSplitDayExercise,
  startSplitWorkout,
} from "@/lib/actions/splits";

const MUSCLES = [
  "chest",
  "back",
  "lats",
  "shoulders",
  "biceps",
  "triceps",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
  "cardio",
];

interface CatalogExercise {
  id: string;
  name: string;
  muscles: string[];
  category: string;
}
interface DayExercise {
  id: string;
  exerciseId: string;
  name: string;
  muscles: string[];
  sets: number;
  repTarget: string | null;
  restSeconds: number;
}
interface Day {
  id: string;
  dayNumber: number;
  name: string;
  focusMuscles: string[];
  notes: string | null;
  exercises: DayExercise[];
}

export function SplitBuilder({
  splitId,
  splitName,
  days,
  catalog,
}: {
  splitId: string;
  splitName: string;
  days: Day[];
  catalog: CatalogExercise[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [addingDay, setAddingDay] = useState(false);
  const [dayName, setDayName] = useState("");
  const [dayFocus, setDayFocus] = useState<string[]>([]);
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  function toggleFocus(m: string) {
    setDayFocus((cur) =>
      cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]
    );
  }

  function createDay() {
    startTransition(async () => {
      const res = await addSplitDay({
        splitId,
        name: dayName,
        focusMuscles: dayFocus,
      });
      if (res.ok) {
        toast("Day added.", "success");
        setDayName("");
        setDayFocus([]);
        setAddingDay(false);
        router.refresh();
      } else {
        toast(res.error ?? "Could not add day", "error");
      }
    });
  }

  function removeDay(dayId: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    startTransition(async () => {
      const res = await deleteSplitDay(dayId, splitId);
      if (res.ok) router.refresh();
      else toast(res.error ?? "Could not delete", "error");
    });
  }

  function removeExercise(rowId: string) {
    startTransition(async () => {
      const res = await removeSplitDayExercise(rowId, splitId);
      if (res.ok) router.refresh();
      else toast(res.error ?? "Could not remove", "error");
    });
  }

  function start(dayId: string) {
    startTransition(async () => {
      const res = await startSplitWorkout(dayId);
      if (res.ok) {
        router.push(`/workout/${res.sessionId}`);
      } else {
        toast(res.error ?? "Could not start", "error");
      }
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{splitName}</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Add training days and fill each with the exercises you choose.
      </p>

      <div className="mt-6 space-y-4">
        {days.map((day) => (
          <div
            key={day.id}
            className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
          >
            <div className="flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                  Day {day.dayNumber}
                </p>
                <p className="text-lg font-bold">{day.name}</p>
                {day.focusMuscles.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {day.focusMuscles.map((m) => (
                      <span
                        key={m}
                        className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-medium capitalize text-[var(--accent-primary)]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeDay(day.id, day.name)}
                disabled={pending}
                aria-label="Delete day"
                className="shrink-0 text-[var(--text-muted)] hover:text-[var(--danger)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {day.exercises.length > 0 && (
              <div className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                {day.exercises.map((ex) => (
                  <div key={ex.id} className="flex items-center gap-3 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{ex.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {ex.sets} sets
                        {ex.repTarget ? ` · ${ex.repTarget}` : ""} ·{" "}
                        {ex.restSeconds}s rest
                      </p>
                    </div>
                    <button
                      onClick={() => removeExercise(ex.id)}
                      disabled={pending}
                      aria-label="Remove exercise"
                      className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2 border-t border-[var(--border-subtle)] p-3">
              <button
                onClick={() => setPickerFor(day.id)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)]"
              >
                <Plus className="h-4 w-4" /> Add exercise
              </button>
              {day.exercises.length > 0 && (
                <button
                  onClick={() => start(day.id)}
                  disabled={pending}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
                >
                  <Play className="h-4 w-4" /> Start workout
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add day */}
      {addingDay ? (
        <div className="mt-4 space-y-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <input
            value={dayName}
            onChange={(e) => setDayName(e.target.value)}
            placeholder="Day name (e.g. Chest & Triceps + light cardio)"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <div>
            <p className="mb-1.5 text-xs text-[var(--text-muted)]">
              Focus (optional)
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleFocus(m)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs capitalize transition-colors",
                    dayFocus.includes(m)
                      ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={createDay}
              disabled={pending || dayName.trim().length < 1}
              size="lg"
              className="flex-1"
            >
              {pending ? "Adding…" : "Add day"}
            </Button>
            <Button
              onClick={() => setAddingDay(false)}
              variant="secondary"
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingDay(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] py-4 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
        >
          <Plus className="h-4 w-4" /> Add day
        </button>
      )}

      {pickerFor && (
        <ExercisePicker
          catalog={catalog}
          onClose={() => setPickerFor(null)}
          onAdd={(exerciseId, sets, repTarget, restSeconds) => {
            const dayId = pickerFor;
            startTransition(async () => {
              const res = await addExerciseToSplitDay({
                splitId,
                dayId,
                exerciseId,
                sets,
                repTarget,
                restSeconds,
              });
              if (res.ok) {
                toast("Exercise added.", "success");
                router.refresh();
              } else {
                toast(res.error ?? "Could not add", "error");
              }
            });
          }}
        />
      )}
    </div>
  );
}

function ExercisePicker({
  catalog,
  onClose,
  onAdd,
}: {
  catalog: CatalogExercise[];
  onClose: () => void;
  onAdd: (
    exerciseId: string,
    sets: number,
    repTarget: string,
    restSeconds: number
  ) => void;
}) {
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<string | null>(null);
  const [selected, setSelected] = useState<CatalogExercise | null>(null);
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState("8–12");
  const [rest, setRest] = useState(90);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return catalog
      .filter((e) => {
        if (muscle && !e.muscles.includes(muscle)) return false;
        if (query && !e.name.toLowerCase().includes(query)) return false;
        return true;
      })
      .slice(0, 60);
  }, [catalog, q, muscle]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-card)] bg-[var(--surface-primary)] sm:rounded-[var(--radius-card)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-4">
          <p className="font-bold">{selected ? "Set details" : "Add exercise"}</p>
          <button onClick={onClose} aria-label="Close">
            <X className="h-5 w-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {selected ? (
          <div className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="h-4 w-4 text-[var(--accent-primary)]" />
              <p className="font-semibold">{selected.name}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                Sets
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={sets}
                  onChange={(e) => setSets(Number(e.target.value))}
                  className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                Reps
                <input
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  placeholder="8–12"
                  className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)]"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
                Rest (s)
                <input
                  type="number"
                  min={0}
                  max={600}
                  step={15}
                  value={rest}
                  onChange={(e) => setRest(Number(e.target.value))}
                  className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm text-[var(--text-primary)]"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  onAdd(selected.id, sets, reps.trim(), rest);
                  onClose();
                }}
                size="lg"
                className="flex-1"
              >
                Add to day
              </Button>
              <Button onClick={() => setSelected(null)} variant="secondary" size="lg">
                Back
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 border-b border-[var(--border-subtle)] p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search exercises…"
                  className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] pl-9 pr-3 text-sm text-[var(--text-primary)] focus:border-[var(--border-active)] focus:outline-none"
                />
              </div>
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setMuscle(null)}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1 text-xs capitalize",
                    !muscle
                      ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                      : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                  )}
                >
                  All
                </button>
                {MUSCLES.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMuscle(muscle === m ? null : m)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1 text-xs capitalize",
                      muscle === m
                        ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                        : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-[var(--text-muted)]">
                  No exercises match.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {filtered.map((e) => (
                    <li key={e.id}>
                      <button
                        onClick={() => setSelected(e)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-secondary)]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{e.name}</p>
                          <p className="truncate text-xs capitalize text-[var(--text-muted)]">
                            {e.muscles.join(", ")}
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 -rotate-90 text-[var(--text-muted)]" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
