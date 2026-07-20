import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CoverImage } from "@/components/ui/cover-image";
import { EnrolButton } from "@/components/enrol-button";
import { getActiveEnrolment } from "@/lib/queries";
import { repDisplay } from "@/lib/utils";
import {
  Clock,
  CalendarDays,
  Dumbbell,
  ShieldAlert,
  Layers,
  ArrowLeft,
} from "lucide-react";
import type {
  Program,
  WorkoutTemplate,
  ProgramWeek,
  WorkoutTemplateExercise,
  Exercise,
} from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

const MODE_LABEL: Record<string, string> = {
  sequential: "Flexible A/B sequence",
  weekly_split: "Weekly split",
  calendar: "Calendar schedule",
};

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("*, fitness_goal:fitness_goals(name, slug)")
    .eq("slug", slug)
    .maybeSingle();

  if (!program || program.status !== "published") notFound();
  const p = program as Program & {
    fitness_goal: { name: string; slug: string } | null;
  };

  const [{ data: weeks }, { data: templates }, activeEnrolment, { data: saved }] =
    await Promise.all([
      supabase
        .from("program_weeks")
        .select("*")
        .eq("program_id", p.id)
        .order("week_number"),
      supabase
        .from("workout_templates")
        .select("*")
        .eq("program_id", p.id)
        .order("sequence_order", { ascending: true, nullsFirst: false })
        .order("week_position", { ascending: true, nullsFirst: false }),
      getActiveEnrolment(user.id),
      supabase
        .from("saved_programs")
        .select("id")
        .eq("user_id", user.id)
        .eq("program_id", p.id)
        .maybeSingle(),
    ]);

  const templateList = (templates ?? []) as WorkoutTemplate[];

  // Sample: first workout's exercises.
  let sampleExercises: (WorkoutTemplateExercise & { exercise: Exercise })[] = [];
  if (templateList[0]) {
    const { data } = await supabase
      .from("workout_template_exercises")
      .select("*, exercise:exercises(*)")
      .eq("workout_template_id", templateList[0].id)
      .order("position");
    sampleExercises = (data ?? []) as (WorkoutTemplateExercise & {
      exercise: Exercise;
    })[];
  }

  const isCurrent = activeEnrolment?.program_id === p.id;
  const hasOtherActive = !!activeEnrolment && activeEnrolment.program_id !== p.id;

  return (
    <div className="pb-12">
      {/* Hero */}
      <div className="relative h-64 w-full sm:h-80">
        <CoverImage
          path={p.cover_image_path}
          alt={p.name}
          sizes="100vw"
          priority
          className=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background-primary)] via-black/40 to-transparent" />
        <Link
          href="/programs"
          className="absolute left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm hover:bg-black/70 sm:left-6"
        >
          <ArrowLeft className="h-4 w-4" /> Programs
        </Link>
        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6">
          {p.fitness_goal && (
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
              {p.fitness_goal.name}
            </p>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {p.name}
          </h1>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
        <div className="mt-5 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
          <Meta icon={CalendarDays} text={`${p.duration_weeks} weeks`} />
          <Meta
            icon={Dumbbell}
            text={`${p.minimum_days_per_week}–${p.maximum_days_per_week} days/week`}
          />
          <Meta icon={Clock} text={`~${p.estimated_session_minutes} min`} />
          <Meta icon={Layers} text={MODE_LABEL[p.scheduling_mode]} />
          <span className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 capitalize">
            {p.experience_level}
          </span>
        </div>

        <p className="mt-5 max-w-2xl text-[var(--text-secondary)]">
          {p.description}
        </p>

        <div className="mt-6 max-w-2xl">
          <EnrolButton
            programId={p.id}
            minDays={p.minimum_days_per_week}
            maxDays={p.maximum_days_per_week}
            isCurrent={isCurrent}
            hasOtherActive={hasOtherActive}
            otherProgramName={activeEnrolment?.program?.name}
            initiallySaved={!!saved}
          />
        </div>

        {p.equipment_requirements.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold">Equipment</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.equipment_requirements.map((e) => (
                <span
                  key={e}
                  className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-sm capitalize text-[var(--text-secondary)]"
                >
                  {e.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Workouts */}
        <div className="mt-8">
          <h2 className="text-lg font-bold">Workouts</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {templateList.map((t) => (
              <div
                key={t.id}
                className="flex gap-3 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
              >
                <div className="relative h-24 w-24 shrink-0">
                  <CoverImage path={t.cover_image_path} alt={t.name} sizes="96px" />
                </div>
                <div className="min-w-0 py-3 pr-3">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{t.name}</p>
                    {t.is_optional && (
                      <span className="rounded-full bg-[var(--surface-elevated)] px-2 py-0.5 text-[10px] uppercase text-[var(--text-muted)]">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-[var(--text-secondary)]">
                    {t.description}
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    {t.estimated_minutes} min · {t.target_muscle_groups.join(" · ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly overview */}
        {weeks && weeks.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold">Weekly overview</h2>
            <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
              {(weeks as ProgramWeek[]).map((w) => (
                <div
                  key={w.id}
                  className="w-40 shrink-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
                >
                  <p className="text-xs text-[var(--text-muted)]">
                    Week {w.week_number}
                    {w.is_deload && (
                      <span className="ml-1 text-[var(--warning)]">· Deload</span>
                    )}
                  </p>
                  <p className="mt-1 font-semibold">{w.name}</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {w.focus}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sample workout */}
        {sampleExercises.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold">
              Sample: {templateList[0]?.name}
            </h2>
            <div className="mt-3 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
              {sampleExercises.map((te) => (
                <div key={te.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{te.exercise?.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {te.exercise?.primary_muscles.join(", ")}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {te.sets} × {repDisplay(te)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Safety */}
        {p.safety_notes && (
          <div className="mt-8 flex gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
            <ShieldAlert className="h-5 w-5 shrink-0 text-[var(--warning)]" />
            <div>
              <p className="font-semibold">Safety considerations</p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {p.safety_notes}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Meta({
  icon: Icon,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-secondary)] px-3 py-1">
      <Icon className="h-3.5 w-3.5" />
      {text}
    </span>
  );
}
