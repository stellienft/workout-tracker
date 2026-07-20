"use client";

import Link from "next/link";
import { useTransition, useState } from "react";
import { CoverImage } from "@/components/ui/cover-image";
import { useToast } from "@/components/ui/toast";
import { setPrimaryGoal } from "@/lib/actions/onboarding";
import { cn } from "@/lib/utils";
import { Check, Star } from "lucide-react";
import type { FitnessGoal } from "@/lib/types";

export function GoalGrid({
  goals,
  primaryId,
}: {
  goals: FitnessGoal[];
  primaryId: string | null;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(primaryId);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {goals.map((g) => {
        const isPrimary = current === g.id;
        return (
          <div
            key={g.id}
            className={cn(
              "group relative overflow-hidden rounded-[var(--radius-card)] border",
              isPrimary ? "border-[var(--border-active)]" : "border-[var(--border-subtle)]"
            )}
          >
            <Link href={`/goals/${g.slug}`} className="block">
              <div className="relative h-36 w-full">
                <CoverImage
                  path={g.cover_image_path}
                  alt={g.name}
                  sizes="(max-width:640px) 100vw, 33vw"
                  className="transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                {isPrimary && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-[var(--accent-primary)] px-2.5 py-1 text-[11px] font-bold text-black">
                    <Star className="h-3 w-3" /> Primary
                  </span>
                )}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-lg font-bold">{g.name}</p>
                  <p className="line-clamp-1 text-xs text-[var(--text-secondary)]">
                    {g.short_description}
                  </p>
                </div>
              </div>
            </Link>
            <div className="p-3">
              <button
                disabled={pending || isPrimary}
                onClick={() =>
                  startTransition(async () => {
                    const res = await setPrimaryGoal(g.id);
                    if (res.ok) {
                      setCurrent(g.id);
                      toast(`${g.name} is now your primary goal.`, "success");
                    } else {
                      toast(res.error ?? "Could not update goal", "error");
                    }
                  })
                }
                className={cn(
                  "flex w-full items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium transition-colors",
                  isPrimary
                    ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                    : "bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--surface-elevated)]"
                )}
              >
                {isPrimary ? (
                  <>
                    <Check className="h-4 w-4" /> Your primary goal
                  </>
                ) : (
                  "Make primary"
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
