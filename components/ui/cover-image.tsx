import Image from "next/image";
import { mediaUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Dumbbell } from "lucide-react";

/**
 * Cover image driven by a Supabase storage path. Falls back to a branded
 * placeholder tile when no image has been uploaded yet (so seeded
 * placeholder paths never render a broken image).
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
  if (!url) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-[var(--surface-secondary)] to-[var(--surface-elevated)]",
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
      className={cn("object-cover", className)}
      style={{ objectPosition: `${focalX * 100}% ${focalY * 100}%` }}
    />
  );
}
