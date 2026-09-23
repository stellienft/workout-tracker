"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { ProgramCard } from "@/components/program-card";
import { cn } from "@/lib/utils";
import type { Program, FitnessGoal } from "@/lib/types";

export function ProgramLibrary({
  programs,
  goals,
  savedIds = [],
}: {
  programs: Program[];
  goals: FitnessGoal[];
  savedIds?: string[];
}) {
  const [q, setQ] = useState("");
  const [goalFilter, setGoalFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [daysFilter, setDaysFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const goalName = useMemo(
    () => Object.fromEntries(goals.map((g) => [g.id, g.name])),
    [goals]
  );
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const activeCount =
    (goalFilter !== "all" ? 1 : 0) +
    (levelFilter !== "all" ? 1 : 0) +
    (daysFilter !== "all" ? 1 : 0);

  const query = q.trim().toLowerCase();
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
    if (
      query &&
      !p.name.toLowerCase().includes(query) &&
      !(p.short_description ?? "").toLowerCase().includes(query)
    )
      return false;
    return true;
  });

  function clearFilters() {
    setGoalFilter("all");
    setLevelFilter("all");
    setDaysFilter("all");
  }

  return (
    <div>
      {/* Search + a single filters toggle keeps browsing calm; the chip rows
          only appear on demand. */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search programs…"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] pl-9 pr-3 text-sm text-[var(--text-primary)] focus:border-[var(--border-active)] focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-medium",
            activeCount > 0 || showFilters
              ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
              : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent-primary)] px-1 text-[11px] font-bold text-[var(--accent-ink)]">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3">
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
          {activeCount > 0 && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 self-start text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-[var(--text-secondary)]">
          No programs match those filters yet.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProgramCard
              key={p.id}
              program={p}
              goalName={p.fitness_goal_id ? goalName[p.fitness_goal_id] : undefined}
              saved={savedSet.has(p.id)}
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
