import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadWorkoutTemplate } from "@/lib/workout-loader";
import { CoverImage } from "@/components/ui/cover-image";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { VideoThumb } from "@/components/workout/video-thumb";
import { repDisplay } from "@/lib/utils";
import { ShieldAlert, Clock } from "lucide-react";

export default async function WorkoutPreviewPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  const { user } = await requireUser();
  const loaded = await loadWorkoutTemplate(templateId, user.id);
  if (!loaded) notFound();

  const { template, exercises } = loaded;

  return (
    <div className="pb-12">
      <div className="relative h-56 w-full sm:h-72">
        <CoverImage path={template.cover_image_path} alt={template.name} sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background-primary)] via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-4xl px-4 pb-5 sm:px-6">
          <h1 className="text-3xl font-extrabold">{template.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Clock className="h-4 w-4" /> {template.estimated_minutes} min ·{" "}
            {exercises.length} exercises
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <p className="mt-5 text-[var(--text-secondary)]">{template.description}</p>

        <div className="sticky top-2 z-10 mt-5">
          <StartWorkoutButton
            workoutTemplateId={template.id}
            existingSessionId={null}
            className="w-full"
          />
        </div>

        <div className="mt-6 space-y-3">
          {exercises.map((ex, i) => (
            <div
              key={ex.id}
              className="flex gap-3 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3"
            >
              <VideoThumb
                thumbnailUrl={ex.video?.thumbnailUrl ?? null}
                coverPath={ex.exercise.cover_image_path}
                alt={ex.exercise.name}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">{i + 1}.</span>
                  <p className="font-semibold">{ex.exercise.name}</p>
                  {!ex.exercise.shoulder_safe && (
                    <ShieldAlert className="h-4 w-4 text-[var(--warning)]" />
                  )}
                </div>
                <p className="text-xs capitalize text-[var(--text-muted)]">
                  {ex.exercise.primary_muscles.join(", ")}
                </p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {ex.sets} sets × {repDisplay(ex)} · {ex.rest_seconds}s rest
                </p>
                {ex.notes && (
                  <p className="mt-1 text-xs text-[var(--warning)]">{ex.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
