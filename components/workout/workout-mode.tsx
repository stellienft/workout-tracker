"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Youtube,
  Repeat,
  ShieldAlert,
  Check,
  Info,
} from "lucide-react";
import { CoverImage } from "@/components/ui/cover-image";
import { RestTimer } from "@/components/workout/rest-timer";
import { VideoSheet } from "@/components/workout/video-sheet";
import { logSet, completeWorkout, saveAndExit, reportDiscomfort } from "@/lib/actions/workout";
import { enqueue, flush, pendingCount } from "@/lib/offline-queue";
import type { LoadedVideo } from "@/lib/workout-loader";
import { cn, formatDuration } from "@/lib/utils";

export interface WorkoutExerciseVM {
  templateExerciseId: string;
  exerciseId: string;
  name: string;
  primaryMuscles: string[];
  instructions: string | null;
  techniqueCues: string[];
  shoulderSafe: boolean;
  shoulderNotes: string | null;
  coverPath: string | null;
  sets: number;
  repTarget: string;
  restSeconds: number;
  notes: string | null;
  isOptional: boolean;
  video: LoadedVideo | null;
  alternatives: { id: string; name: string; slug: string; shoulder_safe: boolean }[];
  previous: {
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    rpe: number | null;
  }[];
}

interface SetState {
  weight: string;
  reps: string;
  rpe: string;
  pain: string;
  done: boolean;
}

export function WorkoutMode({
  sessionId,
  startedAt,
  programName,
  workoutName,
  preShoulderPain,
  exercises,
  initialLogs,
}: {
  sessionId: string;
  startedAt: string;
  programName: string;
  workoutName: string;
  preShoulderPain: number | null;
  exercises: WorkoutExerciseVM[];
  initialLogs: {
    exerciseId: string;
    setNumber: number;
    weightKg: number | null;
    reps: number | null;
    rpe: number | null;
    painLevel: number | null;
    completed: boolean;
  }[];
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  );
  const [showRest, setShowRest] = useState(false);
  const [restSeconds, setRestSeconds] = useState(90);
  const [videoOpen, setVideoOpen] = useState(false);
  const [showCues, setShowCues] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [pending, setPending] = useState(0);

  // Active substitution: exerciseId -> replacement.
  const [subs, setSubs] = useState<
    Record<string, { id: string; name: string; shoulder_safe: boolean }>
  >({});

  // Per-exercise set state, seeded from any existing logs (resume).
  const [state, setState] = useState<Record<string, SetState[]>>(() => {
    const initial: Record<string, SetState[]> = {};
    for (const ex of exercises) {
      const rows: SetState[] = Array.from({ length: ex.sets }, (_, i) => {
        const log = initialLogs.find(
          (l) => l.exerciseId === ex.exerciseId && l.setNumber === i + 1
        );
        return {
          weight: log?.weightKg != null ? String(log.weightKg) : "",
          reps: log?.reps != null ? String(log.reps) : "",
          rpe: log?.rpe != null ? String(log.rpe) : "",
          pain: log?.painLevel != null ? String(log.painLevel) : "",
          done: log?.completed ?? false,
        };
      });
      initial[ex.exerciseId] = rows;
    }
    return initial;
  });

  const current = exercises[index];
  const haptics = true;

  // Elapsed timer.
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Flush any queued offline logs on mount + when we come back online.
  useEffect(() => {
    const doFlush = async () => {
      const res = await flush(logSet);
      setPending(res.remaining);
    };
    doFlush();
    setPending(pendingCount());
    window.addEventListener("online", doFlush);
    return () => window.removeEventListener("online", doFlush);
  }, []);

  const totalSets = useMemo(
    () => exercises.reduce((a, e) => a + e.sets, 0),
    [exercises]
  );
  const completedSets = useMemo(
    () =>
      Object.values(state)
        .flat()
        .filter((s) => s.done).length,
    [state]
  );

  function updateSet(exId: string, setIdx: number, patch: Partial<SetState>) {
    setState((prev) => {
      const rows = [...(prev[exId] ?? [])];
      rows[setIdx] = { ...rows[setIdx], ...patch };
      return { ...prev, [exId]: rows };
    });
  }

  async function persistSet(ex: WorkoutExerciseVM, setIdx: number, row: SetState) {
    const sub = subs[ex.exerciseId];
    const payload = {
      sessionId,
      exerciseId: sub?.id ?? ex.exerciseId,
      templateExerciseId: ex.templateExerciseId,
      substitutedFromExerciseId: sub ? ex.exerciseId : null,
      setNumber: setIdx + 1,
      weightKg: row.weight ? Number(row.weight) : null,
      reps: row.reps ? Number(row.reps) : null,
      rpe: row.rpe ? Number(row.rpe) : null,
      painLevel: row.pain ? Number(row.pain) : null,
      completed: true,
    };
    // Always write locally first, then try the server.
    enqueue(payload);
    setPending(pendingCount());
    try {
      const res = await logSet(payload);
      if (res.ok) {
        const after = await flush(logSet);
        setPending(after.remaining);
      }
    } catch {
      // stays queued
    }
  }

  function completeSet(ex: WorkoutExerciseVM, setIdx: number) {
    const row = state[ex.exerciseId][setIdx];
    const done = !row.done;
    updateSet(ex.exerciseId, setIdx, { done });
    if (done) {
      if (haptics && "vibrate" in navigator) navigator.vibrate?.(30);
      persistSet(ex, setIdx, { ...row, done: true });
      setRestSeconds(ex.restSeconds || 90);
      if (ex.restSeconds > 0) setShowRest(true);
    }
  }

  async function onFinish() {
    setFinishing(true);
    await flush(logSet);
    const res = await completeWorkout({ sessionId, totalSeconds: elapsed });
    if (res.ok) {
      router.push(`/workout/${sessionId}/summary`);
      router.refresh();
    } else {
      setFinishing(false);
    }
  }

  async function onSaveExit() {
    await flush(logSet);
    await saveAndExit(sessionId, elapsed);
    router.push("/dashboard");
    router.refresh();
  }

  const activeName = subs[current.exerciseId]?.name ?? current.name;
  const shoulderRisk =
    (preShoulderPain ?? 0) >= 3 && !current.shoulderSafe && !subs[current.exerciseId];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--background-primary)]">
      {/* Header */}
      <header className="pt-safe border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onSaveExit}
            aria-label="Save and exit"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="text-center">
            <p className="text-xs text-[var(--text-muted)]">{programName}</p>
            <p className="text-sm font-semibold">{workoutName}</p>
          </div>
          <div className="w-9 text-right text-sm font-mono tabular-nums">
            {formatDuration(elapsed)}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
            <div
              className="h-full bg-[var(--accent-primary)] transition-[width]"
              style={{ width: `${(completedSets / totalSets) * 100}%` }}
            />
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {completedSets}/{totalSets} sets
          </span>
        </div>
        {pending > 0 && (
          <p className="mt-1 text-center text-[11px] text-[var(--warning)]">
            {pending} set{pending === 1 ? "" : "s"} saved offline — will sync when
            back online
          </p>
        )}
      </header>

      {/* Body: one exercise at a time */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto w-full max-w-xl">
          <p className="text-xs text-[var(--text-muted)]">
            Exercise {index + 1} of {exercises.length}
          </p>
          <div className="mt-1 flex items-start justify-between gap-2">
            <h1 className="text-2xl font-extrabold">{activeName}</h1>
            {!current.shoulderSafe && (
              <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-[var(--warning)]" />
            )}
          </div>
          <p className="text-sm capitalize text-[var(--text-secondary)]">
            {current.primaryMuscles.join(", ")} · {current.sets} × {current.repTarget}
          </p>

          {subs[current.exerciseId] && (
            <p className="mt-1 text-xs text-[var(--accent-primary)]">
              Substituted for {current.name}
            </p>
          )}

          {shoulderRisk && (
            <div className="mt-3 flex gap-2 rounded-2xl border border-[var(--warning)]/40 bg-[var(--surface-secondary)] p-3">
              <ShieldAlert className="h-5 w-5 shrink-0 text-[var(--warning)]" />
              <div>
                <p className="text-sm font-medium text-[var(--warning)]">
                  Shoulder caution
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  You flagged shoulder pain today and this loads the shoulder. Keep
                  it pain-free or tap Replace for a safer option.
                </p>
              </div>
            </div>
          )}

          {/* Media */}
          <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-[var(--radius-card)]">
            <CoverImage path={current.coverPath} alt={activeName} sizes="600px" />
            <button
              onClick={() => setVideoOpen(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/40"
            >
              <span className="flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black">
                <Youtube className="h-4 w-4" /> Watch technique
              </span>
            </button>
          </div>

          {/* Action row */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setShowCues((s) => !s)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-sm"
            >
              <Info className="h-4 w-4" /> Technique
            </button>
            {current.alternatives.length > 0 && (
              <button
                onClick={() => setShowReplace(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-sm"
              >
                <Repeat className="h-4 w-4" /> Replace
              </button>
            )}
            <button
              onClick={async () => {
                const sev = Number(
                  prompt("Report discomfort — severity 0–10?", "3") ?? ""
                );
                if (!Number.isNaN(sev) && sev >= 0 && sev <= 10) {
                  await reportDiscomfort({
                    sessionId,
                    exerciseId: current.exerciseId,
                    severity: sev,
                  });
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-sm text-[var(--danger)]"
            >
              <ShieldAlert className="h-4 w-4" /> Report pain
            </button>
          </div>

          {showCues && (
            <div className="mt-3 rounded-2xl bg-[var(--surface-primary)] p-4 text-sm">
              {current.instructions && (
                <p className="text-[var(--text-secondary)]">{current.instructions}</p>
              )}
              {current.techniqueCues.length > 0 && (
                <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--text-secondary)]">
                  {current.techniqueCues.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              )}
              {current.shoulderNotes && (
                <p className="mt-2 text-xs text-[var(--warning)]">
                  {current.shoulderNotes}
                </p>
              )}
            </div>
          )}

          {current.notes && (
            <p className="mt-3 rounded-xl bg-[var(--surface-secondary)] p-3 text-xs text-[var(--warning)]">
              {current.notes}
            </p>
          )}

          {/* Sets table */}
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-2 px-1 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <span className="w-8">Set</span>
              <span>Weight</span>
              <span>Reps</span>
              <span>RPE</span>
              <span className="w-11 text-center">Done</span>
            </div>
            {state[current.exerciseId]?.map((row, i) => {
              const prev = current.previous.find((p) => p.set_number === i + 1);
              return (
                <div key={i}>
                  <div className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-2">
                    <span className="w-8 text-center text-sm font-semibold">
                      {i + 1}
                    </span>
                    <SetInput
                      value={row.weight}
                      onChange={(v) => updateSet(current.exerciseId, i, { weight: v })}
                      placeholder={prev?.weight_kg != null ? String(prev.weight_kg) : "kg"}
                    />
                    <SetInput
                      value={row.reps}
                      onChange={(v) => updateSet(current.exerciseId, i, { reps: v })}
                      placeholder={prev?.reps != null ? String(prev.reps) : "reps"}
                    />
                    <SetInput
                      value={row.rpe}
                      onChange={(v) => updateSet(current.exerciseId, i, { rpe: v })}
                      placeholder="RPE"
                    />
                    <button
                      onClick={() => completeSet(current, i)}
                      aria-label={row.done ? "Mark set incomplete" : "Complete set"}
                      className={cn(
                        "flex h-11 w-11 items-center justify-center rounded-xl border transition-colors",
                        row.done
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-black"
                          : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      )}
                    >
                      <Check className="h-5 w-5" />
                    </button>
                  </div>
                  {prev && (
                    <p className="mt-0.5 pl-10 text-[11px] text-[var(--text-muted)]">
                      Previous: {prev.weight_kg ?? "—"}kg × {prev.reps ?? "—"}
                      {prev.rpe ? ` @ RPE ${prev.rpe}` : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky footer: rest timer + nav */}
      <div className="pointer-events-none px-4 pb-safe">
        {showRest && (
          <div className="pb-2">
            <RestTimer
              seconds={restSeconds}
              onClose={() => setShowRest(false)}
              haptics={haptics}
            />
          </div>
        )}
      </div>
      <footer className="border-t border-[var(--border-subtle)] px-4 py-3 pb-safe">
        <div className="mx-auto flex w-full max-w-xl items-center gap-2">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border-subtle)] disabled:opacity-40"
            aria-label="Previous exercise"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          {index < exercises.length - 1 ? (
            <button
              onClick={() => setIndex((i) => i + 1)}
              className="flex h-12 flex-1 items-center justify-center gap-1 rounded-2xl bg-[var(--surface-secondary)] font-semibold"
            >
              Next exercise <ChevronRight className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={onFinish}
              disabled={finishing}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] font-bold text-black disabled:opacity-60"
            >
              <Check className="h-5 w-5" />
              {finishing ? "Finishing…" : "Complete Workout"}
            </button>
          )}
        </div>
      </footer>

      {videoOpen && (
        <VideoSheet
          video={current.video}
          exerciseName={activeName}
          onClose={() => setVideoOpen(false)}
        />
      )}

      {showReplace && (
        <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
            <h3 className="text-lg font-bold">Replace {current.name}</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Pick a substitute. Shoulder-safe options are marked.
            </p>
            <div className="mt-4 space-y-2">
              {subs[current.exerciseId] && (
                <button
                  onClick={() => {
                    setSubs((s) => {
                      const n = { ...s };
                      delete n[current.exerciseId];
                      return n;
                    });
                    setShowReplace(false);
                  }}
                  className="w-full rounded-2xl border border-[var(--border-subtle)] p-3 text-left text-sm"
                >
                  ↩ Use original ({current.name})
                </button>
              )}
              {current.alternatives.map((alt) => (
                <button
                  key={alt.id}
                  onClick={() => {
                    setSubs((s) => ({
                      ...s,
                      [current.exerciseId]: {
                        id: alt.id,
                        name: alt.name,
                        shoulder_safe: alt.shoulder_safe,
                      },
                    }));
                    setShowReplace(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-subtle)] p-3 text-left"
                >
                  <span className="font-medium">{alt.name}</span>
                  {alt.shoulder_safe && (
                    <span className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[11px] text-[var(--accent-primary)]">
                      Shoulder-safe
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowReplace(false)}
              className="mt-4 w-full rounded-2xl py-2 text-sm text-[var(--text-secondary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SetInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      inputMode="decimal"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2 text-center text-sm focus:border-[var(--border-active)] focus:outline-none"
    />
  );
}
