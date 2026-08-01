"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Youtube,
  Repeat,
  ShieldAlert,
  Check,
  Plus,
  Trash2,
  Play,
  Square,
  Pause,
  Calculator,
  Flame,
  MoreHorizontal,
  Maximize2,
} from "lucide-react";
import { ExerciseImage } from "@/components/ui/exercise-image";
import { RestTimer } from "@/components/workout/rest-timer";
import { VideoSheet } from "@/components/workout/video-sheet";
import { WorkoutTools, type Tab as ToolsTab } from "@/components/workout/workout-tools";
import { progressionSuggestion } from "@/lib/gym-math";
import {
  logSet,
  completeWorkout,
  saveAndExit,
  cancelWorkout,
  logWarmup,
  reportDiscomfort,
  deleteSetLog,
  deleteExerciseSets,
  getExerciseDetail,
} from "@/lib/actions/workout";
import { WarmupSheet } from "@/components/workout/warmup-sheet";
import { enqueue, flush, pendingCount } from "@/lib/offline-queue";
import type { LoadedVideo, AltOption } from "@/lib/workout-loader";
import { combineConcerns, exerciseConcern } from "@/lib/injury";
import { cn, formatDuration } from "@/lib/utils";

interface SubDetail {
  id: string;
  name: string;
  shoulder_safe: boolean;
  shoulderNotes: string | null;
  instructions: string | null;
  techniqueCues: string[];
  coverPath: string | null;
  primaryMuscles: string[];
  video: LoadedVideo | null;
}

export interface WorkoutExerciseVM {
  templateExerciseId: string | null;
  exerciseId: string;
  name: string;
  trackingType: "reps" | "time";
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
  supersetGroup: number | null;
  video: LoadedVideo | null;
  alternatives: AltOption[];
  moreAlternatives: AltOption[];
  previous: {
    set_number: number;
    weight_kg: number | null;
    reps: number | null;
    rpe: number | null;
  }[];
}

interface SetState {
  n: number; // stable set number used for persistence
  weight: string;
  reps: string;
  seconds: string; // for time-based exercises
  rpe: string;
  pain: string;
  done: boolean;
}

interface GroupMeta {
  letter: string;
  idx: number;
  size: number;
  type: "superset" | "circuit";
}

function fmtSecs(s: number): string {
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

export function WorkoutMode({
  sessionId,
  initialSeconds,
  programName,
  workoutName,
  considerations,
  injuryAreas,
  exercises,
  initialLogs,
  initialWarmup,
}: {
  sessionId: string;
  initialSeconds: number;
  programName: string;
  workoutName: string;
  considerations?: string | null;
  injuryAreas?: string[] | null;
  initialWarmup?: { type: string | null; seconds: number | null };
  exercises: WorkoutExerciseVM[];
  initialLogs: {
    exerciseId: string;
    setNumber: number;
    weightKg: number | null;
    reps: number | null;
    durationSeconds?: number | null;
    rpe: number | null;
    painLevel: number | null;
    completed: boolean;
  }[];
}) {
  const router = useRouter();
  const resumeBaseRef = useRef(Date.now() - Math.max(0, initialSeconds) * 1000);
  const [elapsed, setElapsed] = useState(Math.max(0, initialSeconds));

  const [showRest, setShowRest] = useState(false);
  const [restSeconds, setRestSeconds] = useState(90);
  const [restNonce, setRestNonce] = useState(0);

  const [tools, setTools] = useState<{ tab: ToolsTab; weight: number | null } | null>(null);
  const [showWarmup, setShowWarmup] = useState(false);
  const [warmup, setWarmup] = useState<{ type: string; seconds: number } | null>(
    initialWarmup?.type && initialWarmup.seconds != null
      ? { type: initialWarmup.type, seconds: initialWarmup.seconds }
      : null
  );

  const [cancelling, setCancelling] = useState(false);
  const [showRpe, setShowRpe] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [pending, setPending] = useState(0);
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  // Per-exercise overlays, keyed by exerciseId.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [replaceFor, setReplaceFor] = useState<string | null>(null);
  const [enlargeFor, setEnlargeFor] = useState<string | null>(null);
  const [videoFor, setVideoFor] = useState<string | null>(null);

  // Active substitution: exerciseId -> replacement detail.
  const [subs, setSubs] = useState<Record<string, SubDetail>>({});

  // Count-up stopwatch for time-based exercises.
  const [timer, setTimer] = useState<
    { exerciseId: string; setIdx: number; base: number; startedAt: number } | null
  >(null);
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!timer) return;
    const id = setInterval(() => forceTick((t) => t + 1), 250);
    return () => clearInterval(id);
  }, [timer]);

  const [state, setState] = useState<Record<string, SetState[]>>(() => {
    const initial: Record<string, SetState[]> = {};
    for (const ex of exercises) {
      initial[ex.exerciseId] = Array.from({ length: ex.sets }, (_, i) => {
        const log = initialLogs.find(
          (l) => l.exerciseId === ex.exerciseId && l.setNumber === i + 1
        );
        return {
          n: i + 1,
          weight: log?.weightKg != null ? String(log.weightKg) : "",
          reps: log?.reps != null ? String(log.reps) : "",
          seconds: log?.durationSeconds != null ? String(log.durationSeconds) : "",
          rpe: log?.rpe != null ? String(log.rpe) : "",
          pain: log?.painLevel != null ? String(log.painLevel) : "",
          done: log?.completed ?? false,
        };
      });
    }
    return initial;
  });

  const workingExercises = useMemo(
    () => exercises.filter((e) => !removed.has(e.exerciseId)),
    [exercises, removed]
  );

  // Superset / circuit grouping by exerciseId.
  const groupByExId = useMemo(() => {
    const map = new Map<string, GroupMeta>();
    let letterIdx = 0;
    let i = 0;
    while (i < workingExercises.length) {
      const g = workingExercises[i].supersetGroup;
      let j = i;
      while (j < workingExercises.length && g != null && workingExercises[j].supersetGroup === g) j++;
      const size = j - i;
      if (g != null && size >= 2) {
        const letter = String.fromCharCode(65 + letterIdx);
        letterIdx++;
        for (let k = i; k < j; k++) {
          map.set(workingExercises[k].exerciseId, {
            letter,
            idx: k - i,
            size,
            type: size >= 3 ? "circuit" : "superset",
          });
        }
        i = j;
      } else {
        i += 1;
      }
    }
    return map;
  }, [workingExercises]);

  const concerns = useMemo(
    () => combineConcerns(injuryAreas, considerations),
    [injuryAreas, considerations]
  );
  const haptics = true;

  const activeId = (ex: WorkoutExerciseVM) => subs[ex.exerciseId]?.id ?? ex.exerciseId;

  // Display detail, substitute-aware.
  function activeFor(ex: WorkoutExerciseVM) {
    const sub = subs[ex.exerciseId];
    return {
      name: sub?.name ?? ex.name,
      instructions: sub ? sub.instructions : ex.instructions,
      techniqueCues: sub ? sub.techniqueCues : ex.techniqueCues,
      coverPath: sub ? sub.coverPath : ex.coverPath,
      primaryMuscles: sub ? sub.primaryMuscles : ex.primaryMuscles,
      shoulderNotes: sub ? sub.shoulderNotes : ex.shoulderNotes,
      video: sub ? sub.video : ex.video,
      substituted: !!sub,
    };
  }

  // Elapsed timer, background-accurate.
  useEffect(() => {
    const compute = () =>
      setElapsed(Math.max(0, Math.floor((Date.now() - resumeBaseRef.current) / 1000)));
    compute();
    const t = setInterval(compute, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") compute();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

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
    () => workingExercises.reduce((a, e) => a + (state[e.exerciseId]?.length ?? 0), 0),
    [workingExercises, state]
  );
  const completedSets = useMemo(
    () =>
      workingExercises.reduce(
        (a, e) => a + (state[e.exerciseId]?.filter((s) => s.done).length ?? 0),
        0
      ),
    [workingExercises, state]
  );

  function updateSet(exId: string, setIdx: number, patch: Partial<SetState>) {
    setState((prev) => {
      const rows = [...(prev[exId] ?? [])];
      rows[setIdx] = { ...rows[setIdx], ...patch };
      return { ...prev, [exId]: rows };
    });
  }

  async function persistSet(ex: WorkoutExerciseVM, row: SetState) {
    const sub = subs[ex.exerciseId];
    const payload = {
      sessionId,
      exerciseId: sub?.id ?? ex.exerciseId,
      templateExerciseId: ex.templateExerciseId,
      substitutedFromExerciseId: sub ? ex.exerciseId : null,
      setNumber: row.n,
      weightKg: ex.trackingType === "time" ? null : row.weight ? Number(row.weight) : null,
      reps: row.reps ? Number(row.reps) : null,
      durationSeconds:
        ex.trackingType === "time" && row.seconds ? Number(row.seconds) : null,
      rpe: row.rpe ? Number(row.rpe) : null,
      painLevel: row.pain ? Number(row.pain) : null,
      completed: true,
    };
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

  function setRpe(ex: WorkoutExerciseVM, setIdx: number, v: string) {
    const row = state[ex.exerciseId]?.[setIdx];
    if (!row) return;
    updateSet(ex.exerciseId, setIdx, { rpe: v });
    if (row.done) persistSet(ex, { ...row, rpe: v }); // keep a saved set in sync
  }

  function startRest(sec: number) {
    if (sec <= 0) return;
    setRestSeconds(sec);
    setRestNonce((n) => n + 1);
    setShowRest(true);
  }

  function completeSet(ex: WorkoutExerciseVM, setIdx: number) {
    const row = state[ex.exerciseId][setIdx];
    const done = !row.done;
    updateSet(ex.exerciseId, setIdx, { done });
    if (done) {
      if (haptics && "vibrate" in navigator) navigator.vibrate?.(30);
      persistSet(ex, { ...row, done: true });
      // Supersets: no rest between movements, only after the last of the group.
      const meta = groupByExId.get(ex.exerciseId);
      if (meta && meta.idx < meta.size - 1) return;
      startRest(ex.restSeconds || 90);
    }
  }

  function addSet(ex: WorkoutExerciseVM) {
    setState((prev) => {
      const rows = prev[ex.exerciseId] ?? [];
      const nextN = rows.reduce((m, r) => Math.max(m, r.n), 0) + 1;
      const last = rows[rows.length - 1];
      return {
        ...prev,
        [ex.exerciseId]: [
          ...rows,
          { n: nextN, weight: last?.weight ?? "", reps: "", seconds: "", rpe: "", pain: "", done: false },
        ],
      };
    });
  }

  function deleteSet(ex: WorkoutExerciseVM, setIdx: number) {
    const row = state[ex.exerciseId]?.[setIdx];
    if (!row) return;
    setState((prev) => {
      const rows = [...(prev[ex.exerciseId] ?? [])];
      rows.splice(setIdx, 1);
      return { ...prev, [ex.exerciseId]: rows };
    });
    if (row.done) {
      deleteSetLog({ sessionId, exerciseId: activeId(ex), setNumber: row.n }).catch(() => {});
    }
  }

  function removeExercise(ex: WorkoutExerciseVM) {
    if (
      !confirm(
        `Remove ${subs[ex.exerciseId]?.name ?? ex.name} from this workout? Any logged sets for it will be deleted.`
      )
    )
      return;
    setMenuFor(null);
    setRemoved((prev) => new Set(prev).add(ex.exerciseId));
    deleteExerciseSets({ sessionId, exerciseId: activeId(ex) }).catch(() => {});
  }

  async function onFinish() {
    setFinishing(true);
    setFinishError(null);
    try {
      const flushed = await flush(logSet);
      setPending(flushed.remaining);
      if (flushed.remaining > 0) {
        setFinishError(
          `${flushed.remaining} set${flushed.remaining === 1 ? "" : "s"} haven't synced yet — reconnect and tap again so nothing is lost.`
        );
        setFinishing(false);
        return;
      }
      const res = await completeWorkout({ sessionId, totalSeconds: elapsed });
      if (res.ok) {
        router.push(`/workout/${sessionId}/summary`);
        router.refresh();
        return;
      }
      setFinishError(res.error ?? "Couldn't finish — please try again.");
    } catch {
      setFinishError("Network hiccup. Your sets are saved — tap Complete again to finish.");
    }
    setFinishing(false);
  }

  async function onSaveExit() {
    await flush(logSet);
    await saveAndExit(sessionId, elapsed);
    router.push("/dashboard");
    router.refresh();
  }

  async function onCancel() {
    if (
      !confirm(
        "Cancel this workout? It will be discarded and any sets you logged will be deleted. This can't be undone."
      )
    )
      return;
    setCancelling(true);
    const res = await cancelWorkout(sessionId);
    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setCancelling(false);
      setFinishError(res.error ?? "Couldn't cancel — please try again.");
    }
  }

  function saveWarmup(type: string, seconds: number) {
    setWarmup({ type, seconds });
    setShowWarmup(false);
    void logWarmup({ sessionId, type, seconds });
  }

  function pickReplacement(alt: AltOption) {
    const exId = replaceFor;
    if (!exId) return;
    setReplaceFor(null);
    setSubs((s) => ({
      ...s,
      [exId]: {
        id: alt.id,
        name: alt.name,
        shoulder_safe: alt.shoulder_safe,
        shoulderNotes: null,
        instructions: null,
        techniqueCues: [],
        coverPath: null,
        primaryMuscles: [],
        video: null,
      },
    }));
    void getExerciseDetail(alt.id).then((detail) => {
      if (detail) setSubs((s) => ({ ...s, [exId]: detail }));
    });
  }

  // Timer helpers (time-based exercises).
  const timerActive = (exId: string, i: number) =>
    timer != null && timer.exerciseId === exId && timer.setIdx === i;
  const timerSecs = (exId: string, rows: SetState[], i: number) => {
    if (timerActive(exId, i) && timer)
      return timer.base + Math.floor((Date.now() - timer.startedAt) / 1000);
    return Number(rows[i]?.seconds || 0);
  };
  function toggleTimer(exId: string, rows: SetState[], i: number) {
    if (timerActive(exId, i)) {
      updateSet(exId, i, { seconds: String(timerSecs(exId, rows, i)) });
      setTimer(null);
    } else {
      setTimer({ exerciseId: exId, setIdx: i, base: Number(rows[i]?.seconds || 0), startedAt: Date.now() });
    }
  }

  const menuEx = workingExercises.find((e) => e.exerciseId === menuFor) ?? null;
  const replaceEx = workingExercises.find((e) => e.exerciseId === replaceFor) ?? null;
  const enlargeEx = workingExercises.find((e) => e.exerciseId === enlargeFor) ?? null;
  const videoEx = workingExercises.find((e) => e.exerciseId === videoFor) ?? null;
  const allDone = totalSets > 0 && completedSets === totalSets;

  if (workingExercises.length === 0) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-[var(--background-primary)] p-6 text-center">
        <p className="text-[var(--text-secondary)]">All exercises removed from this workout.</p>
        {finishError && <p className="max-w-xs text-sm text-[var(--warning)]">{finishError}</p>}
        <div className="flex gap-2">
          <button onClick={onSaveExit} className="rounded-2xl border border-[var(--border-subtle)] px-4 py-3 text-sm">
            Save &amp; exit
          </button>
          <button
            onClick={onFinish}
            disabled={finishing}
            className="rounded-2xl bg-[var(--accent-primary)] px-4 py-3 font-semibold text-[var(--accent-ink)]"
          >
            {finishing ? "Finishing…" : "Complete workout"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--background-primary)]">
      {/* Header */}
      <header className="pt-safe z-10 border-b border-[var(--border-subtle)] bg-[var(--background-primary)] px-4 py-3">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={onSaveExit}
              aria-label="Pause workout and exit"
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[var(--surface-secondary)] px-3 text-xs font-semibold text-[var(--text-secondary)]"
            >
              <Pause className="h-4 w-4" /> Pause
            </button>
            <button
              onClick={onCancel}
              disabled={cancelling}
              aria-label="Cancel and discard workout"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-secondary)] hover:text-[var(--danger)] disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-w-0 text-center">
            <p className="truncate text-xs text-[var(--text-muted)]">{programName}</p>
            <p className="truncate text-sm font-semibold">{workoutName}</p>
          </div>
          <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1.5 text-sm font-mono font-semibold tabular-nums">
            {formatDuration(elapsed)}
          </span>
        </div>
        <div className="mx-auto mt-2 flex w-full max-w-xl items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-secondary)]">
            <div
              className="h-full bg-[var(--accent-primary)] transition-[width]"
              style={{ width: `${totalSets ? (completedSets / totalSets) * 100 : 0}%` }}
            />
          </div>
          <span className="text-xs text-[var(--text-muted)]">
            {completedSets}/{totalSets}
          </span>
        </div>
        {pending > 0 && (
          <p className="mt-1 text-center text-[11px] text-[var(--warning)]">
            {pending} set{pending === 1 ? "" : "s"} saved offline — will sync when back online
          </p>
        )}
        {showRest && (
          <div className="mx-auto mt-3 w-full max-w-xl">
            <RestTimer
              key={restNonce}
              seconds={restSeconds}
              onClose={() => setShowRest(false)}
              haptics={haptics}
            />
          </div>
        )}
      </header>

      {/* Scrollable exercise list */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-full max-w-xl space-y-3">
          {/* Warm-up chip */}
          {warmup ? (
            <button
              onClick={() => setShowWarmup(true)}
              className="flex w-full items-center gap-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-2.5 text-left"
            >
              <Flame className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
              <span className="flex-1 text-sm">
                Warmed up · {warmup.type} · {fmtSecs(warmup.seconds)}
              </span>
              <span className="text-xs text-[var(--text-muted)]">Edit</span>
            </button>
          ) : (
            <button
              onClick={() => setShowWarmup(true)}
              className="flex w-full items-center gap-2 rounded-2xl border border-dashed border-[var(--border-subtle)] px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)]"
            >
              <Flame className="h-4 w-4 shrink-0 text-[var(--accent-primary)]" />
              <span className="flex-1">Warm up — bike, treadmill or light cardio</span>
              <Plus className="h-4 w-4 text-[var(--text-muted)]" />
            </button>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setShowRpe((v) => !v)}
              aria-pressed={showRpe}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                showRpe
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                  : "border-[var(--border-subtle)] text-[var(--text-muted)]"
              )}
            >
              {showRpe ? "Hide RPE" : "Log RPE"}
            </button>
          </div>

          {workingExercises.map((ex) => renderCard(ex))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] px-4 py-3 pb-safe">
        {finishError && (
          <p className="mx-auto mb-2 w-full max-w-xl rounded-xl bg-[var(--surface-secondary)] px-3 py-2 text-xs text-[var(--warning)]">
            {finishError}
          </p>
        )}
        <button
          onClick={onFinish}
          disabled={finishing}
          className={cn(
            "mx-auto flex w-full max-w-xl items-center justify-center gap-2 rounded-2xl py-4 font-bold disabled:opacity-60",
            allDone
              ? "bg-[var(--accent-primary)] text-[var(--accent-ink)]"
              : "bg-[var(--surface-secondary)] text-[var(--text-primary)]"
          )}
        >
          <Check className="h-5 w-5" />
          {finishing ? "Finishing…" : allDone ? "Complete workout" : "Finish workout"}
        </button>
      </footer>

      {/* Enlarge lightbox */}
      {enlargeEx && (() => {
        const a = activeFor(enlargeEx);
        return (
          <div
            className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setEnlargeFor(null)}
          >
            <div
              className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-video w-full bg-black">
                <ExerciseImage path={a.coverPath} alt={a.name} />
                <button
                  onClick={() => setEnlargeFor(null)}
                  aria-label="Close"
                  className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="overflow-y-auto p-5">
                <h3 className="text-lg font-bold">{a.name}</h3>
                <p className="text-sm capitalize text-[var(--text-secondary)]">
                  {a.primaryMuscles.join(", ")}
                </p>
                {a.video && (
                  <button
                    onClick={() => {
                      setVideoFor(enlargeEx.exerciseId);
                      setEnlargeFor(null);
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)]"
                  >
                    <Youtube className="h-4 w-4" /> Watch technique
                  </button>
                )}
                {a.instructions && (
                  <p className="mt-3 text-sm text-[var(--text-secondary)]">{a.instructions}</p>
                )}
                {a.techniqueCues.length > 0 && (
                  <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--text-secondary)]">
                    {a.techniqueCues.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                )}
                {a.shoulderNotes && (
                  <p className="mt-2 text-xs text-[var(--warning)]">{a.shoulderNotes}</p>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {videoEx && (
        <VideoSheet
          video={activeFor(videoEx).video}
          exerciseName={activeFor(videoEx).name}
          onClose={() => setVideoFor(null)}
        />
      )}

      {tools && (
        <WorkoutTools onClose={() => setTools(null)} initialTab={tools.tab} defaultWeight={tools.weight} />
      )}

      {showWarmup && (
        <WarmupSheet
          initialType={warmup?.type ?? null}
          initialSeconds={warmup?.seconds ?? null}
          onClose={() => setShowWarmup(false)}
          onSave={saveWarmup}
        />
      )}

      {/* Per-exercise actions menu */}
      {menuEx && (
        <div
          className="fixed inset-0 z-[160] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setMenuFor(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--border-subtle)] p-4">
              <p className="truncate font-semibold">{activeFor(menuEx).name}</p>
            </div>
            <MenuItem
              icon={<Repeat className="h-5 w-5" />}
              label="Replace exercise"
              onClick={() => {
                setReplaceFor(menuEx.exerciseId);
                setMenuFor(null);
              }}
            />
            <MenuItem
              icon={<Calculator className="h-5 w-5" />}
              label="Plate & 1RM tools"
              onClick={() => {
                const rows = state[menuEx.exerciseId] ?? [];
                const w =
                  Number(rows.find((r) => r.weight)?.weight) ||
                  menuEx.previous[0]?.weight_kg ||
                  null;
                setTools({ tab: "plates", weight: w });
                setMenuFor(null);
              }}
            />
            <MenuItem
              icon={<ShieldAlert className="h-5 w-5 text-[var(--danger)]" />}
              label="Report pain"
              onClick={async () => {
                const id = menuEx.exerciseId;
                setMenuFor(null);
                const sev = Number(prompt("Report discomfort — severity 0–10?", "3") ?? "");
                if (!Number.isNaN(sev) && sev >= 0 && sev <= 10) {
                  await reportDiscomfort({ sessionId, exerciseId: id, severity: sev });
                }
              }}
            />
            <MenuItem
              icon={<Trash2 className="h-5 w-5" />}
              label="Remove from workout"
              danger
              onClick={() => removeExercise(menuEx)}
            />
            <button
              onClick={() => setMenuFor(null)}
              className="w-full border-t border-[var(--border-subtle)] py-3 text-sm text-[var(--text-secondary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Replace sheet */}
      {replaceEx && (
        <div className="fixed inset-0 z-[170] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="flex max-h-[80vh] w-full max-w-md flex-col rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5">
            <h3 className="text-lg font-bold">Replace {replaceEx.name}</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Pick a substitute. Shoulder-safe options are marked.
            </p>
            <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
              {subs[replaceEx.exerciseId] && (
                <button
                  onClick={() => {
                    setSubs((s) => {
                      const n = { ...s };
                      delete n[replaceEx.exerciseId];
                      return n;
                    });
                    setReplaceFor(null);
                  }}
                  className="w-full rounded-2xl border border-[var(--border-subtle)] p-3 text-left text-sm"
                >
                  ↩ Use original ({replaceEx.name})
                </button>
              )}
              {replaceEx.alternatives.length > 0 && (
                <ReplaceGroup label="Recommended" options={replaceEx.alternatives} onPick={pickReplacement} />
              )}
              {replaceEx.moreAlternatives.length > 0 && (
                <ReplaceGroup
                  label={`More ${replaceEx.primaryMuscles[0] ?? ""} options`.trim()}
                  options={replaceEx.moreAlternatives}
                  onPick={pickReplacement}
                />
              )}
              {replaceEx.alternatives.length === 0 && replaceEx.moreAlternatives.length === 0 && (
                <p className="text-sm text-[var(--text-muted)]">No alternatives available for this exercise.</p>
              )}
            </div>
            <button
              onClick={() => setReplaceFor(null)}
              className="mt-4 w-full rounded-2xl py-2 text-sm text-[var(--text-secondary)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // --- per-exercise card (plain function so inputs keep focus) ---
  function renderCard(ex: WorkoutExerciseVM) {
    const a = activeFor(ex);
    const rows = state[ex.exerciseId] ?? [];
    const meta = groupByExId.get(ex.exerciseId) ?? null;
    const timed = ex.trackingType === "time";
    const concernLabel = a.substituted ? null : exerciseConcern(concerns, a.primaryMuscles);
    const rpeCol = !timed && showRpe;
    const colsClass = timed
      ? "grid-cols-[1.5rem_1fr_2.75rem]"
      : rpeCol
        ? "grid-cols-[1.5rem_1fr_1fr_3rem_2.75rem]"
        : "grid-cols-[1.5rem_1fr_1fr_2.75rem]";

    const bigLift = a.primaryMuscles.some((m) =>
      ["quads", "quadriceps", "hamstrings", "glutes", "back", "lats"].includes(m.toLowerCase())
    );
    const suggestion =
      timed || a.substituted
        ? null
        : progressionSuggestion(ex.previous, ex.repTarget, bigLift ? 5 : 2.5);

    function applySuggestion() {
      if (!suggestion) return;
      setState((prev) => {
        const rs = (prev[ex.exerciseId] ?? []).map((r) =>
          r.done || r.weight ? r : { ...r, weight: String(suggestion.weightKg) }
        );
        return { ...prev, [ex.exerciseId]: rs };
      });
    }

    return (
      <section
        key={ex.exerciseId}
        className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
      >
        {/* Card header */}
        <div className="flex items-center gap-3 p-3">
          <button
            onClick={() => setEnlargeFor(ex.exerciseId)}
            aria-label={`Enlarge ${a.name} demo`}
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]"
          >
            <ExerciseImage path={a.coverPath} alt={a.name} />
            <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded bg-black/55 text-white">
              <Maximize2 className="h-2.5 w-2.5" />
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {meta && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded bg-[var(--accent-primary)] px-1 text-[11px] font-bold text-[var(--accent-ink)]">
                  {meta.letter}
                </span>
              )}
              <p className="truncate font-semibold leading-tight">{a.name}</p>
              {concernLabel && <ShieldAlert className="h-4 w-4 shrink-0 text-[var(--warning)]" />}
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge>Sets {rows.length}</Badge>
              {ex.repTarget && <Badge>Reps {ex.repTarget}</Badge>}
              {ex.restSeconds > 0 && <Badge>Rest {fmtSecs(ex.restSeconds)}</Badge>}
            </div>
          </div>
          <button
            onClick={() => setMenuFor(ex.exerciseId)}
            aria-label="Exercise options"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-secondary)]"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {a.substituted && (
          <p className="px-3 pb-1 text-xs text-[var(--accent-primary)]">Substituted for {ex.name}</p>
        )}
        {suggestion && (
          <button
            onClick={applySuggestion}
            className="mx-3 mb-1 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-muted)] px-3 py-1 text-xs font-medium text-[var(--accent-primary)]"
          >
            {suggestion.headline} · tap to fill
          </button>
        )}
        {ex.notes && (
          <p className="mx-3 mb-1 rounded-lg bg-[var(--surface-secondary)] p-2 text-xs text-[var(--warning)]">
            {ex.notes}
          </p>
        )}

        {/* Sets */}
        <div className="border-t border-[var(--border-subtle)] px-3 py-2">
          <div
            className={cn(
              "grid items-center gap-2 px-1 pb-1 text-[11px] uppercase tracking-wide text-[var(--text-muted)]",
              colsClass
            )}
          >
            <span>#</span>
            {timed ? (
              <span>Time</span>
            ) : (
              <>
                <span>Weight</span>
                <span>Reps</span>
                {rpeCol && <span className="text-center">RPE</span>}
              </>
            )}
            <span className="text-center">Done</span>
          </div>

          {rows.map((row, i) => {
            const prev = ex.previous.find((p) => p.set_number === i + 1);
            const weightPlaceholder =
              suggestion?.weightKg != null
                ? String(suggestion.weightKg)
                : prev?.weight_kg != null
                  ? String(prev.weight_kg)
                  : "kg";
            const repsPlaceholder =
              suggestion?.reps != null
                ? String(suggestion.reps)
                : prev?.reps != null
                  ? String(prev.reps)
                  : "reps";
            return (
              <div key={row.n} className={cn("grid items-center gap-2 py-1", colsClass)}>
                <span className="text-center text-sm font-semibold text-[var(--text-secondary)]">
                  {i + 1}
                </span>
                {timed ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleTimer(ex.exerciseId, rows, i)}
                      aria-label={timerActive(ex.exerciseId, i) ? "Stop timer" : "Start timer"}
                      className={cn(
                        "inline-flex h-11 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold tabular-nums",
                        timerActive(ex.exerciseId, i)
                          ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--accent-ink)]"
                          : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                      )}
                    >
                      {timerActive(ex.exerciseId, i) ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {fmtSecs(timerSecs(ex.exerciseId, rows, i))}
                    </button>
                    <SetInput
                      value={row.seconds}
                      onChange={(v) => updateSet(ex.exerciseId, i, { seconds: v })}
                      placeholder="sec"
                    />
                  </div>
                ) : (
                  <>
                    <SetInput
                      value={row.weight}
                      onChange={(v) => updateSet(ex.exerciseId, i, { weight: v })}
                      placeholder={weightPlaceholder}
                    />
                    <SetInput
                      value={row.reps}
                      onChange={(v) => updateSet(ex.exerciseId, i, { reps: v })}
                      placeholder={repsPlaceholder}
                    />
                    {rpeCol && (
                      <SetInput
                        value={row.rpe}
                        onChange={(v) => setRpe(ex, i, v)}
                        placeholder="RPE"
                      />
                    )}
                  </>
                )}
                <button
                  onClick={() => completeSet(ex, i)}
                  aria-label={row.done ? "Mark set incomplete" : "Complete set"}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center justify-self-center rounded-full border transition-colors",
                    row.done
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-[var(--accent-ink)]"
                      : "border-[var(--border-subtle)] text-[var(--text-muted)]"
                  )}
                >
                  <Check className="h-5 w-5" />
                </button>
              </div>
            );
          })}

          <div className="mt-1 flex items-center gap-2">
            <button
              onClick={() => addSet(ex)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border-subtle)] py-2.5 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
            >
              <Plus className="h-4 w-4" /> Add set
            </button>
            {rows.length > 1 && (
              <button
                onClick={() => deleteSet(ex, rows.length - 1)}
                aria-label="Remove last set"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--danger)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-[var(--surface-secondary)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
      {children}
    </span>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3.5 text-left text-sm font-medium last:border-b-0",
        danger ? "text-[var(--danger)]" : "text-[var(--text-primary)]"
      )}
    >
      <span className="shrink-0 text-[var(--text-secondary)]">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function ReplaceGroup({
  label,
  options,
  onPick,
}: {
  label: string;
  options: AltOption[];
  onPick: (a: AltOption) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <div className="space-y-2">
        {options.map((alt) => (
          <button
            key={alt.id}
            onClick={() => onPick(alt)}
            className="flex w-full items-center justify-between rounded-2xl border border-[var(--border-subtle)] p-3 text-left"
          >
            <span className="font-medium capitalize">{alt.name}</span>
            {alt.shoulder_safe && (
              <span className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-[11px] text-[var(--accent-primary)]">
                Shoulder-safe
              </span>
            )}
          </button>
        ))}
      </div>
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
      className="h-11 w-full min-w-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-center text-sm focus:border-[var(--border-active)] focus:outline-none"
    />
  );
}
