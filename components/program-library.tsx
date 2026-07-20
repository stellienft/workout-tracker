"use client";

import { useMemo, useState } from "react";
import { ProgramCard } from "@/components/program-card";
import { cn } from "@/lib/utils";
import type { Program, FitnessGoal } from "@/lib/types";

export function ProgramLibrary({
  programs,
  goals,
}: {
  programs: Program[];
  goals: FitnessGoal[];
}) {
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [daysFilter, setDaysFilter] = useState<string>("all");

  const goalName = useMemo(
    () => Object.fromEntries(goals.map((g) => [g.id, g.name])),
    [goals]
  );

  const filtered = programs.filter((p) => {
    if (goalFilter !== "all" && p.fitness_goal_id !== goalFilter) return false;
    if (
      levelFilter !== "all" &&
      p.experience_level !== levelFilter &&
      p.experience_level !== "all"
    )
      return false;
    if (daysFilter !== "all") {
      const d = Number(daysFilter);
      if (d < p.minimum_days_per_week || d > p.maximum_days_per_week) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="flex flex-col gap-3">
        <FilterRow label="Goal">
          <Chip active={goalFilter === "all"} onClick={() => setGoalFilter("all")}>
            All
          </Chip>
          {goals
            .filter((g) => programs.some((p) => p.fitness_goal_id === g.id))
            .map((g) => (
              <Chip
                key={g.id}
                active={goalFilter === g.id}
                onClick={() => setGoalFilter(g.id)}
              >
                {g.name}
              </Chip>
            ))}
        </FilterRow>
        <FilterRow label="Experience">
          {["all", "beginner", "intermediate", "advanced"].map((l) => (
            <Chip
              key={l}
              active={levelFilter === l}
              onClick={() => setLevelFilter(l)}
            >
              {l === "all" ? "All" : l}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Days / week">
          {["all", "2", "3", "4", "5"].map((d) => (
            <Chip key={d} active={daysFilter === d} onClick={() => setDaysFilter(d)}>
              {d === "all" ? "All" : d}
            </Chip>
          ))}
        </FilterRow>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-[var(--text-secondary)]">
          No programs match those filters yet.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              goalName={p.fitness_goal_id ? goalName[p.fitness_goal_id] : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </span>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm capitalize transition-colors",
        active
          ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
          : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      )}
    >
      {children}
    </button>
  );
}
