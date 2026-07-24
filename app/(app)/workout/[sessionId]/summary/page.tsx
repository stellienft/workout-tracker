import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/utils";
import { Confetti } from "@/components/ui/confetti";
import { ShareAchievement } from "@/components/achievements/share-achievement";
import { Check, Trophy, PartyPopper } from "lucide-react";

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

  const totalVolume = (logs ?? []).reduce(
    (a, l) => a + (Number(l.weight_kg ?? 0) * Number(l.reps ?? 0)),
    0
  );
  const setCount = (logs ?? []).length;

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
            {(session.template as unknown as { name: string } | null)?.name} ·{" "}
            {programName}
          </p>
        </>
      )}

      <div className="mt-8 grid w-full grid-cols-3 gap-3">
        <Stat label="Time" value={formatDuration(session.total_seconds ?? 0)} />
        <Stat label="Sets" value={String(setCount)} />
        <Stat
          label="Volume"
          value={totalVolume > 0 ? `${Math.round(totalVolume)}kg` : "—"}
        />
      </div>

      {session.discomfort_reported && (
        <p className="mt-4 rounded-xl bg-[var(--surface-secondary)] p-3 text-sm text-[var(--warning)]">
          You reported some discomfort today. Consider a lighter session or the
          Recovery workout next time, and log it in your check-in.
        </p>
      )}

      <div className="mt-8 flex w-full flex-col gap-2">
        {programComplete ? (
          <>
            <Link
              href="/programs"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[var(--accent-primary)] py-3.5 font-semibold text-black"
            >
              <PartyPopper className="h-5 w-5" /> Choose your next program
            </Link>
            <ShareAchievement
              group="Attendance"
              title="Program complete!"
              description={`I finished ${programName} on Stellio Fit.`}
              label="Share your achievement"
            />
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
