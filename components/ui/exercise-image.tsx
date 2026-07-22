"use client";

import { useState } from "react";
import { mediaUrl, cn } from "@/lib/utils";
import { Dumbbell } from "lucide-react";

/**
 * Exercise thumbnail/demo image. Uses a plain <img> (not next/image) so that
 * animated GIFs — e.g. ExerciseDB demos — actually animate and load from any
 * host without an image-optimizer allowlist. Falls back to a branded tile when
 * there's no image or it fails to load.
 */
export function ExerciseImage({
  path,
  alt,
  className,
}: {
  path: string | null | undefined;
  alt: string;
  className?: string;
}) {
  const url = mediaUrl(path);
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        className={cn(
          "absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--surface-elevated)]",
          className
        )}
        role="img"
        aria-label={alt}
      >
        <Dumbbell className="h-6 w-6 text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
