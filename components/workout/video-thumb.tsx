import { ExerciseImage } from "@/components/ui/exercise-image";

/**
 * Exercise thumbnail. Always shows the animated GIF demo (via ExerciseImage,
 * which uses a plain <img> so GIFs animate) — never a YouTube thumbnail.
 */
export function VideoThumb({
  coverPath,
  alt,
}: {
  coverPath: string | null;
  alt: string;
}) {
  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-secondary)]">
      <ExerciseImage path={coverPath} alt={alt} />
    </div>
  );
}
