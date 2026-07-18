"use client";

import { useState } from "react";
import { X, ExternalLink, Youtube } from "lucide-react";
import type { LoadedVideo } from "@/lib/workout-loader";

/**
 * Bottom-sheet YouTube player. Shows the thumbnail first (performance), and
 * only loads the privacy-enhanced embed when the user taps play. Always
 * offers a "Watch on YouTube" fallback and never autoplays with sound.
 */
export function VideoSheet({
  video,
  exerciseName,
  onClose,
}: {
  video: LoadedVideo | null;
  exerciseName: string;
  onClose: () => void;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/70">
      <div className="w-full max-w-2xl rounded-t-[var(--radius-card)] border-t border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 pb-safe">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">{exerciseName}</h3>
          <button
            onClick={onClose}
            aria-label="Close video"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-secondary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {video?.verificationStatus === "placeholder" && (
          <p className="mt-2 rounded-xl bg-[var(--surface-secondary)] p-2 text-xs text-[var(--warning)]">
            A verified video hasn&apos;t been added yet. This links to a YouTube
            search — check the technique notes below the video.
          </p>
        )}

        <div className="mt-3 aspect-video w-full overflow-hidden rounded-2xl bg-black">
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

        <a
          href={video?.sourceUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 text-sm text-[var(--accent-primary)]"
        >
          <ExternalLink className="h-4 w-4" /> Watch on YouTube
        </a>
        {video?.creatorName && (
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Video by {video.creatorName}. Stellio Fit is not affiliated with or
            endorsed by the creator.
          </p>
        )}
      </div>
    </div>
  );
}
