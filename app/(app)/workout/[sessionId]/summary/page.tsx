import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/utils";
import { Confetti } from "@/components/ui/confetti";
import { ShareAchievement } from "@/components/achievements/share-achievement";
import { ShareWorkoutButton } from "@/components/feed/share-workout-button";
import { Check, Trophy, PartyPopper, TrendingUp, TrendingDown, Minus, Star } from "lucide-react";

export const metadata = { title: "Workout complete" };

export default async function WorkoutSummaryPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from("workout_sessions")
    .select("*, template:workout_templates(name), program:programs(name)")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!session) notFound();

  // set_logs has TWO foreign keys to exercises (exercise_id and
  // substituted_from_exercise_id), so the embed MUST name the constraint —
  // otherwise PostgREST can't disambiguate, errors the whole query, and returns
  // null, which shows the workout as "0 sets".
  const { data: logs } = await supabase
    .from("set_logs")
    .select("exercise_id, weight_kg, reps, exercise:exercises!exercise_id(name)")
    .eq("session_id", sessionId)
    .eq("completed", true);

  // Did this session finish the whole program? The enrolment flips to
  // "completed" with the same timestamp as the session that closed it out.
  let programComplete = false;
  if (session.enrolment_id && session.completed_at) {
    const { data: enrolment } = await supabase
      .from("program_enrolments")
      .select("status, completed_at")
      .eq("id", session.enrolment_id)
      .maybeSingle();
    programComplete =
      enrolment?.status === "completed" &&
      !!enrolment.completed_at &&
      Math.abs(
        new Date(enrolment.completed_at).getTime() -
          new Date(session.completed_at).getTime()
      ) < 60_000;
  }

  const programName =
    (session.program as unknown as { name: string } | null)?.name ?? "your program";
  const workoutName =
    (session.template as unknown as { name: string } | null)?.name ?? "Workout";

  const totalVolume = (logs ?? []).reduce(
    (a, l) => a + (Number(l.weight_kg ?? 0) * Number(l.reps ?? 0)),
    0
  );
  const setCount = (logs ?? []).length;
  const duration = formatDuration(session.total_seconds ?? 0);

  // Previous completed session for the same user — used to compute the
  // volume delta vs this session so we can celebrate improvement.
  let prevVolume: number | null = null;
  if (session.completed_at) {
    const { data: prevSession } = await supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .lt("completed_at", session.completed_at)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (prevSession) {
      const { data: prevLogs } = await supabase
        .from("set_logs")
        .select("weight_kg, reps")
        .eq("session_id", prevSession.id)
        .eq("completed", true);
      prevVolume = (prevLogs ?? []).reduce(
        (a, l) => a + (Number(l.weight_kg ?? 0) * Number(l.reps ?? 0)),
        0
      );
    }
  }

  // Delta in kg vs the previous session. null when there's no prior session
  // to compare against (first ever, or first completed).
  const volumeDelta =
    prevVolume !== null ? Math.round(totalVolume - prevVolume) : null;
  const isImprovement = volumeDelta !== null && volumeDelta > 0;

  // ---- Personal bests set THIS session (vs everything before it) ----
  const exName = (l: { exercise?: unknown }) => {
    const e = (l as { exercise?: { name?: string } | { name?: string }[] }).exercise;
    return (Array.isArray(e) ? e[0]?.name : e?.name) ?? "Exercise";
  };
  const sessBy = new Map<string, { name: string; maxWeight: number; volume: number }>();
  for (const l of logs ?? []) {
    const w = Number(l.weight_kg ?? 0);
    const r = Number(l.reps ?? 0);
    if (!(w > 0 && r > 0)) continue;
    const id = l.exercise_id as string;
    const cur = sessBy.get(id) ?? { name: exName(l), maxWeight: 0, volume: 0 };
    cur.maxWeight = Math.max(cur.maxWeight, w);
    cur.volume += w * r;
    sessBy.set(id, cur);
  }

  const exIds = [...sessBy.keys()];
  const prevMaxWeight = new Map<string, number>();
  const prevMaxVolume = new Map<string, number>();
  if (exIds.length && session.started_at) {
    const { data: hist } = await supabase
      .from("set_logs")
      .select("exercise_id, weight_kg, reps, session_id")
      .eq("user_id", user.id)
      .eq("completed", true)
      .in("exercise_id", exIds)
      .lt("created_at", session.started_at)
      .limit(5000);
    const volBySession = new Map<string, Map<string, number>>();
    for (const h of hist ?? []) {
      const w = Number(h.weight_kg ?? 0);
      const r = Number(h.reps ?? 0);
      const id = h.exercise_id as string;
      if (w > 0) prevMaxWeight.set(id, Math.max(prevMaxWeight.get(id) ?? 0, w));
      if (w > 0 && r > 0) {
        const m = volBySession.get(id) ?? new Map<string, number>();
        const sid = (h.session_id as string) ?? "x";
        m.set(sid, (m.get(sid) ?? 0) + w * r);
        volBySession.set(id, m);
      }
    }
    for (const [id, m] of volBySession) prevMaxVolume.set(id, Math.max(0, ...m.values()));
  }

  const fmtKg = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));
  interface ExPR {
    name: string;
    lines: { label: string; value?: string; delta: string }[];
  }
  const prExercises: ExPR[] = [];
  let prCount = 0;
  for (const [id, e] of sessBy) {
    const pmw = prevMaxWeight.get(id) ?? 0;
    const pmv = prevMaxVolume.get(id) ?? 0;
    const lines: ExPR["lines"] = [];
    // Only genuine improvements (there must be prior history to beat).
    if (pmw > 0 && e.maxWeight > pmw) {
      lines.push({
        label: "Max weight",
        value: `${fmtKg(e.maxWeight)} kg`,
        delta: `+${fmtKg(e.maxWeight - pmw)} kg`,
      });
    }
    if (pmv > 0 && e.volume > pmv) {
      const pct = ((e.volume - pmv) / pmv) * 100;
      lines.push({ label: "Max volume (all sets)", delta: `+${pct.toFixed(1)}%` });
    }
    if (lines.length) {
      prExercises.push({ name: e.name, lines });
      prCount += lines.length;
    }
  }
  const celebratePB = prCount > 0;

  const dateLabel = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : undefined;

  // Share-card copy. group='Milestones' gives the kicker "Milestone reached";
  // we feed the stats in as the title/subtitle and the date as the footnote,
  // and show a dumbbell icon on the medallion.
  const shareTitle =
    totalVolume > 0 ? `${Math.round(totalVolume).toLocaleString()}kg` : "Workout done";
  const shareSubtitle = [
    workoutName,
    `${setCount} set${setCount === 1 ? "" : "s"}`,
    duration,
  ]
    .join(" · ");

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-6 py-12 text-center">
      {(programComplete || celebratePB) && <Confetti />}

      {celebratePB ? (
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-[3px] border-[var(--accent-primary)] bg-[var(--accent-muted)]">
          <div className="absolute -top-1.5 flex gap-0.5">
            {[0, 1, 2].map((i) => (
              <Star
                key={i}
                className="h-3.5 w-3.5 fill-[var(--accent-primary)] text-[var(--accent-primary)]"
              />
            ))}
          </div>
          <span className="mt-1 text-4xl font-extrabold text-[var(--accent-primary)]">
            {prCount}
          </span>
        </div>
      ) : (
        <div
          className={`flex h-20 w-20 items-center justify-center rounded-full ${
            programComplete ? "bg-[var(--accent-primary)]" : "bg-[var(--accent-muted)]"
          }`}
        >
          {programComplete ? (
            <PartyPopper className="h-10 w-10 text-[var(--accent-ink)]" />
          ) : (
            <Trophy className="h-10 w-10 text-[var(--accent-primary)]" />
          )}
        </div>
      )}

      {celebratePB ? (
        <>
          <h1 className="mt-6 text-3xl font-extrabold">
            {prCount} new personal best{prCount === 1 ? "" : "s"}!
          </h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            {programComplete
              ? `You finished ${programName} — and set new records.`
              : "Congratulations! Your hard work paid off."}
          </p>
          <div className="mt-6 w-full divide-y divide-[var(--border-subtle)] text-left">
            {prExercises.map((ex, i) => (
              <div key={i} className="py-3.5">
                <p className="font-semibold">{ex.name}</p>
                {ex.lines.map((ln, j) => (
                  <div key={j} className="mt-1 flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--text-muted)]">{ln.label}</span>
                    <span className="flex items-center gap-2 text-sm">
                      {ln.value && <span className="font-semibold">{ln.value}</span>}
                      <span className="inline-flex items-center gap-1 font-bold text-[var(--accent-primary)]">
                        <TrendingUp className="h-4 w-4" /> {ln.delta}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : programComplete ? (
        <>
          <h1 className="mt-6 text-3xl font-extrabold">Program complete! 🎉</h1>
          <p className="mt-2 text-[var(--text-secondary)]">
            You finished <span className="font-semibold text-[var(--text-primary)]">{programName}</span>.
            That&apos;s a huge milestone — be proud of the work you put in.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-6 text-3xl font-extrabold">Workout complete</h1>
          <p className="mt-1 text-[var(--text-secondary)]">
            {workoutName} · {programName}
          </p>
        </>
      )}

      <div className="mt-8 grid w-full grid-cols-3 gap-3">
        <Stat label="Time" value={duration} />
        <Stat label="Sets" value={String(setCount)} />
        <Stat
          label="Volume"
          value={totalVolume > 0 ? `${Math.round(totalVolume)}kg` : "—"}
        />
      </div>

      {session.warmup_seconds ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">
          🔥 Warm-up · {session.warmup_type} ·{" "}
          {formatDuration(session.warmup_seconds as number)}
        </p>
      ) : null}

      {/* Improvement delta vs the previous session. */}
      {volumeDelta !== null && (
        <div className="mt-4">
          <DeltaBadge delta={volumeDelta} />
          {isImprovement && (
            <p className="mt-2 text-sm font-medium text-[var(--accent-primary)]">
              Lifted {Math.abs(volumeDelta).toLocaleString()}kg more than your last session!
            </p>
          )}
        </div>
      )}

      {session.discomfort_reported && (
        <p className="mt-4 rounded-xl bg-[var(--surface-secondary)] p-3 text-sm text-[var(--warning)]">
          You reported some discomfort today. Consider a lighter session or the
          Recovery workout next time, and log it in your check-in.
        </p>
      )}

      <div className="mt-8 flex w-full flex-col gap-2">
        {/* Always-available share card for the session stats. */}
        <ShareAchievement
          group="Milestones"
          icon="dumbbell"
          title={shareTitle}
          description={shareSubtitle}
          dateLabel={dateLabel}
          label="Share workout"
        />

        <ShareWorkoutButton
          sessionId={sessionId}
          defaultCaption={`${workoutName} done — ${setCount} set${
            setCount === 1 ? "" : "s"
          }${totalVolume > 0 ? ` · ${Math.round(totalVolume).toLocaleString()}kg volume` : ""} 💪`}
        />

        {programComplete ? (
          <>
            <Link
              href="/programs"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] py-3.5 font-semibold text-[var(--accent-ink)]"
            >
              <PartyPopper className="h-5 w-5" /> Choose your next program
            </Link>
            <Link
              href="/dashboard"
              className="rounded-2xl border border-[var(--border-subtle)] py-3.5 text-sm"
            >
              Back to dashboard
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] py-3.5 font-semibold text-[var(--accent-ink)]"
            >
              <Check className="h-5 w-5" /> Back to dashboard
            </Link>
            <Link
              href="/check-ins"
              className="rounded-2xl border border-[var(--border-subtle)] py-3.5 text-sm"
            >
              Log a recovery check-in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const positive = delta > 0;
  const zero = delta === 0;
  const Icon = positive ? TrendingUp : zero ? Minus : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
        positive
          ? "bg-[var(--accent-primary)] text-[var(--accent-ink)]"
          : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {positive ? "+" : ""}
      {Math.abs(delta).toLocaleString()}kg vs last
    </span>
  );
}
