"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type ToggleResult = {
  ok: boolean;
  favorited?: boolean;
  saved?: boolean;
  error?: string;
};

/**
 * Heart toggle used for favouriting exercises and programs. Optimistic: it
 * flips instantly and reverts if the server action fails. `variant="overlay"`
 * is styled to sit on top of a card image; `variant="plain"` is a bare icon
 * button for detail headers.
 */
export function FavoriteButton({
  initial,
  onToggle,
  variant = "overlay",
  className,
}: {
  initial: boolean;
  onToggle: () => Promise<ToggleResult>;
  variant?: "overlay" | "plain";
  className?: string;
}) {
  const [fav, setFav] = useState(initial);
  const [pending, startTransition] = useTransition();

  function click(e: React.MouseEvent) {
    // Cards are usually wrapped in a <Link>; don't navigate when favouriting.
    e.preventDefault();
    e.stopPropagation();
    const next = !fav;
    setFav(next);
    startTransition(async () => {
      const res = await onToggle();
      if (!res.ok) setFav(!next);
      else if (typeof res.favorited === "boolean") setFav(res.favorited);
      else if (typeof res.saved === "boolean") setFav(res.saved);
    });
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      aria-pressed={fav}
      aria-label={fav ? "Remove from favourites" : "Add to favourites"}
      className={cn(
        "inline-flex items-center justify-center transition-colors",
        variant === "overlay"
          ? "h-9 w-9 rounded-full bg-black/55 text-white backdrop-blur-sm hover:bg-black/70"
          : "h-11 w-11 rounded-2xl border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--border-active)]",
        className
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5",
          fav ? "fill-[var(--accent-primary)] text-[var(--accent-primary)]" : ""
        )}
      />
    </button>
  );
}
