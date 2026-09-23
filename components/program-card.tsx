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
        <div className="relative h-32 w-full sm:h-40">
          <CoverImage
            path={program.cover_image_path}
            alt={program.name}
            sizes="(max-width: 1024px) 50vw, 33vw"
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
          {program.featured && (
            <span className="absolute left-2.5 top-2.5 rounded-full bg-[var(--accent-primary)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-ink)]">
              Featured
            </span>
          )}
          <div className="on-media absolute inset-x-0 bottom-0 p-3 sm:p-4">
            <h3 className="text-sm font-bold leading-tight sm:text-lg">{program.name}</h3>
          </div>
        </div>
        <div className="p-3 sm:p-4">
          {goalName && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-primary)] sm:text-[11px]">
              {goalName}
            </p>
          )}
          <p className="line-clamp-2 text-xs text-[var(--text-secondary)] sm:text-sm">
            {program.short_description}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-x-2.5 gap-y-1 text-[11px] text-[var(--text-muted)] sm:gap-x-3 sm:text-xs">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {program.duration_weeks} wks
            </span>
            <span className="inline-flex items-center gap-1">
              <Dumbbell className="h-3.5 w-3.5" />
              {program.minimum_days_per_week}–{program.maximum_days_per_week}/wk
            </span>
            <span className="hidden items-center gap-1 sm:inline-flex">
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
