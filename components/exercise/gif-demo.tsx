"use client";

import { useState } from "react";
import { mediaUrl } from "@/lib/utils";
import { Dumbbell } from "lucide-react";

/**
 * Animated demo for exercises that ship a GIF (e.g. ExerciseDB imports). Shown
 * in place of the YouTube player, which would otherwise read "No embed
 * available". The GIF sits on a light panel (the demos have white backgrounds)
 * and is object-contained so nothing is cropped.
 */
export function GifDemo({
  path,
  name,
}: {
  path: string | null | undefined;
  name: string;
}) {
  const url = mediaUrl(path);
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div className="mx-auto flex aspect-square w-full max-w-md items-center justify-center rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-secondary)]">
        <Dumbbell className="h-8 w-8 text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`${name} demonstration`}
        onError={() => setFailed(true)}
        className="h-full w-full object-contain"
      />
      <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--accent-primary)]" />
        Live demo
      </span>
    </div>
  );
}
