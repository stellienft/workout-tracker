"use client";

import { FavoriteButton } from "@/components/ui/favorite-button";
import { toggleSavedProgram } from "@/lib/actions/enrolment";

export function ProgramFavoriteButton({
  programId,
  initial,
  variant = "overlay",
  className,
}: {
  programId: string;
  initial: boolean;
  variant?: "overlay" | "plain";
  className?: string;
}) {
  return (
    <FavoriteButton
      initial={initial}
      onToggle={() => toggleSavedProgram(programId)}
      variant={variant}
      className={className}
    />
  );
}
