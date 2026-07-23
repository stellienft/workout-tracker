"use client";

import { FavoriteButton } from "@/components/ui/favorite-button";
import { toggleExerciseFavorite } from "@/lib/actions/exercises";

export function ExerciseFavoriteButton({
  exerciseId,
  initial,
  variant = "plain",
  className,
}: {
  exerciseId: string;
  initial: boolean;
  variant?: "overlay" | "plain";
  className?: string;
}) {
  return (
    <FavoriteButton
      initial={initial}
      onToggle={() => toggleExerciseFavorite(exerciseId)}
      variant={variant}
      className={className}
    />
  );
}
