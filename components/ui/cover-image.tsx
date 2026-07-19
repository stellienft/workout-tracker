"use client";

import Image from "next/image";
import { useState } from "react";
import { mediaUrl, cn } from "@/lib/utils";
import { Dumbbell } from "lucide-react";

/**
 * Cover image driven by a Supabase storage path. Falls back to a branded
 * placeholder tile when no image has been set OR when the image fails to
 * load (e.g. a seeded path whose asset hasn't been uploaded yet), so the
 * UI never shows a broken image.
 */
export function CoverImage({
  path,
  alt,
  focalX = 0.5,
  focalY = 0.5,
  className,
  sizes = "100vw",
  priority = false,
}: {
  path: string | null | undefined;
  alt: string;
  focalX?: number;
  focalY?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
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
        aria-label={alt}
        role="img"
      >
        <Dumbbell className="h-10 w-10 text-[var(--text-muted)]" />
      </div>
    );
  }

  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
      style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }}
    />
  );
}
