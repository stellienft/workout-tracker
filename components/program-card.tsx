import Link from "next/link";
import { CoverImage } from "@/components/ui/cover-image";
import { ProgramFavoriteButton } from "@/components/program-favorite-button";
import { Clock, CalendarDays, Dumbbell } from "lucide-react";
import type { Program } from "@/lib/types";

export function ProgramCard({
  program,
  goalName,
  saved = false,
}: {
  program: Program;
  goalName?: string;
  saved?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] transition-transform active:scale-[0.99]">
      {/* Favourite heart sits above the link (a sibling, not nested in the anchor). */}
      <ProgramFavoriteButton
        programId={program.id}
        initial={saved}
        className="absolute right-3 top-3 z-10"
      />
      <Link href={`/programs/${program.slug}`} className="block">
        <div className="relative h-40 w-full">
          <CoverImage
            path={program.cover_image_path}
            alt={program.name}
            sizes="(max-width: 640px) 100vw, 33vw"
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          {program.featured && (
            <span className="absolute left-3 top-3 rounded-full bg-[var(--accent-primary)] px-2.5 py-1 text-[11px] font-bold text-black">
              Featured
            </span>
          )}
          <div className="absolute inset-x-0 bottom-0 p-4">
            {goalName && (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
                {goalName}
              </p>
            )}
            <h3 className="text-lg font-bold leading-tight">{program.name}</h3>
          </div>
        </div>
        <div className="p-4">
          <p className="line-clamp-2 text-sm text-[var(--text-secondary)]">
            {program.short_description}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {program.duration_weeks} weeks
            </span>
            <span className="inline-flex items-center gap-1">
              <Dumbbell className="h-3.5 w-3.5" />
              {program.minimum_days_per_week}–{program.maximum_days_per_week} days/wk
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {program.estimated_session_minutes} min
            </span>
            <span className="capitalize">{program.experience_level}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
