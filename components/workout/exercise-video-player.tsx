"use client";

import { useState } from "react";
import { ExternalLink, Youtube } from "lucide-react";
import type { LoadedVideo } from "@/lib/workout-loader";

/**
 * Inline (non-modal) YouTube player for exercise detail pages. Thumbnail
 * first, privacy-enhanced embed on tap, YouTube fallback always present.
 */
export function ExerciseVideoPlayer({
  video,
  exerciseName,
}: {
  video: LoadedVideo | null;
  exerciseName: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div>
      {video?.verificationStatus === "placeholder" && (
        <p className="mb-2 rounded-xl bg-[var(--surface-secondary)] p-2 text-xs text-[var(--warning)]">
          A verified video hasn&apos;t been added for this exercise yet. The link
          below opens a YouTube search — follow the written technique cues meanwhile.
        </p>
      )}
      <div className="aspect-video w-full overflow-hidden rounded-[var(--radius-card)] bg-black">
        {video?.embedUrl && playing ? (
          <iframe
            src={`${video.embedUrl}?rel=0&modestbranding=1`}
            title={video.title ?? exerciseName}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <button
            onClick={() => video?.embedUrl && setPlaying(true)}
            className="relative flex h-full w-full items-center justify-center"
            style={
              video?.thumbnailUrl
                ? {
                    backgroundImage: `url(${video.thumbnailUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-black/40" />
            <span className="relative flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 py-2 font-semibold text-black">
              <Youtube className="h-5 w-5" />
              {video?.embedUrl ? "Play video" : "No embed available"}
            </span>
          </button>
        )}
      </div>
      {video && (
        <a
          href={video.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 text-sm text-[var(--accent-primary)]"
        >
          <ExternalLink className="h-4 w-4" /> Watch on YouTube
        </a>
      )}
    </div>
  );
}
