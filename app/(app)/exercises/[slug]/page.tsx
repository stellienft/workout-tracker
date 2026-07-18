import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui/page-header";
import { ExerciseVideoPlayer } from "@/components/workout/exercise-video-player";
import { CoverImage } from "@/components/ui/cover-image";
import { normaliseVideoForClient } from "@/lib/video-utils";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { Exercise, ExerciseVideo } from "@/lib/types";

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await requireUser();
  const supabase = await createClient();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!exercise) notFound();
  const e = exercise as Exercise;

  const [{ data: videoRow }, { data: alts }] = await Promise.all([
    supabase
      .from("exercise_videos")
      .select("*")
      .eq("exercise_id", e.id)
      .eq("active", true)
      .order("verification_status")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("exercise_alternatives")
      .select(
        "alternative:exercises!exercise_alternatives_alternative_exercise_id_fkey(name, slug, shoulder_safe)"
      )
      .eq("exercise_id", e.id)
      .order("priority"),
  ]);

  const video = normaliseVideoForClient(videoRow as ExerciseVideo | null);

  return (
    <PageShell>
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
          <CoverImage path={e.cover_image_path} alt={e.name} sizes="96px" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{e.name}</h1>
            {!e.shoulder_safe && (
              <ShieldAlert className="h-5 w-5 text-[var(--warning)]" />
            )}
          </div>
          <p className="mt-1 text-sm capitalize text-[var(--text-secondary)]">
            {e.primary_muscles.join(", ")}
            {e.secondary_muscles.length
              ? ` · ${e.secondary_muscles.join(", ")}`
              : ""}
          </p>
          <p className="text-xs capitalize text-[var(--text-muted)]">
            {e.equipment.join(", ")} · {e.difficulty}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ExerciseVideoPlayer video={video} exerciseName={e.name} />
      </div>

      {e.instructions && (
        <div className="mt-6">
          <h2 className="text-lg font-bold">How to do it</h2>
          <p className="mt-2 text-[var(--text-secondary)]">{e.instructions}</p>
        </div>
      )}

      {e.technique_cues.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Technique cues</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--text-secondary)]">
            {e.technique_cues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {e.shoulder_notes && (
        <div className="mt-4 flex gap-2 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <ShieldAlert className="h-5 w-5 shrink-0 text-[var(--warning)]" />
          <div>
            <p className="font-semibold">Shoulder guidance</p>
            <p className="text-sm text-[var(--text-secondary)]">{e.shoulder_notes}</p>
          </div>
        </div>
      )}

      {alts && alts.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold">Alternatives</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {alts.map((a, i) => {
              const alt = a.alternative as unknown as {
                name: string;
                slug: string;
                shoulder_safe: boolean;
              };
              return (
                <Link
                  key={i}
                  href={`/exercises/${alt.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-sm"
                >
                  {alt.name}
                  {alt.shoulder_safe && (
                    <span className="text-[11px] text-[var(--accent-primary)]">
                      shoulder-safe
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
