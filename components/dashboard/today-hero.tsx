import Link from "next/link";
import { CoverImage } from "@/components/ui/cover-image";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { Clock, Dumbbell, Gauge } from "lucide-react";
import type { WorkoutTemplate } from "@/lib/types";

export function TodayHeroCard({
  programName,
  workout,
  sessionId,
  week,
}: {
  programName: string;
  workout: WorkoutTemplate;
  sessionId: string | null;
  week: number;
}) {
  return (
    <div className="relative h-72 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] sm:h-80">
      <CoverImage
        path={workout.cover_image_path}
        alt={workout.name}
        sizes="(max-width: 1024px) 100vw, 66vw"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
      <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between">
          <span className="rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-primary)] backdrop-blur">
            {programName} · Week {week}
          </span>
          {workout.is_optional && (
            <span className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] uppercase text-[var(--text-secondary)] backdrop-blur">
              Optional
            </span>
          )}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            Today&apos;s workout
          </p>
          <h2 className="text-3xl font-extrabold leading-tight">{workout.name}</h2>
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {workout.estimated_minutes} min
            </span>
            <span className="inline-flex items-center gap-1 capitalize">
              <Gauge className="h-4 w-4" />
              {workout.difficulty}
            </span>
            {workout.target_muscle_groups.length > 0 && (
              <span className="inline-flex items-center gap-1 capitalize">
                <Dumbbell className="h-4 w-4" />
                {workout.target_muscle_groups.slice(0, 3).join(" · ")}
              </span>
            )}
          </div>
          <div className="mt-4 flex items-center gap-2">
            <StartWorkoutButton
              workoutTemplateId={workout.id}
              existingSessionId={sessionId}
            />
            <Link
              href={`/workouts/${workout.id}`}
              className="rounded-2xl border border-white/20 bg-black/30 px-4 py-3 text-sm backdrop-blur"
            >
              Preview
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
