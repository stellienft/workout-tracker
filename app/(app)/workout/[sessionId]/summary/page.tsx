import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/utils";
import { Confetti } from "@/components/ui/confetti";
import { ShareAchievement } from "@/components/achievements/share-achievement";
import { Check, Trophy, PartyPopper, TrendingUp, TrendingDown, Minus } from "lucide-react";

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

  const { data: logs } = await supabase
    .from("set_logs")
    .select("exercise_id, weight_kg, reps, exercise:exercises(name)")
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

  const dateLabel = session.completed_at
    ? new Date(session.completed_at).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : undefined;

  // Share-card copy. The ShareAchievement component maps group='Milestones'
  // to emoji 🏋️ and kicker "Milestone reached"; we feed the stats in as the
  // title/subtitle and the date as the footnote.
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
      {programComplete && <Confetti />}
      <div
        className={`flex h-20 w-20 items-center justify-center rounded-full ${
          programComplete ? "bg-[var(--accent-primary)]" : "bg-[var(--accent-muted)]"
        }`}
      >
        {programComplete ? (
          <PartyPopper className="h-10 w-10 text-black" />
        ) : (
          <Trophy className="h-10 w-10 text-[var(--accent-primary)]" />
        )}
      </div>
      {programComplete ? (
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
          title={shareTitle}
          description={shareSubtitle}
          dateLabel={dateLabel}
          label="Share workout"
        />

        {programComplete ? (
          <>
            <Link
              href="/programs"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] py-3.5 font-semibold text-black"
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
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] py-3.5 font-semibold text-black"
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
          ? "bg-[var(--accent-primary)] text-black"
          : "bg-[var(--surface-secondary)] text-[var(--text-muted)]"
      }`}
    >
      <Icon className="h-4 w-4" />
      {positive ? "+" : ""}
      {Math.abs(delta).toLocaleString()}kg vs last
    </span>
  );
}
