"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExerciseImage } from "@/components/ui/exercise-image";
import { cn } from "@/lib/utils";
import { ShieldAlert, Search } from "lucide-react";
import type { Exercise } from "@/lib/types";

export function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(exercises.map((e) => e.category)))],
    [exercises]
  );

  const filtered = exercises.filter((e) => {
    if (category !== "all" && e.category !== category) return false;
    if (q) {
      const hay = (
        e.name +
        " " +
        e.primary_muscles.join(" ") +
        " " +
        e.equipment.join(" ")
      ).toLowerCase();
      if (!hay.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search exercises, muscles, equipment…"
          className="h-12 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] pl-10 pr-4 text-sm focus:border-[var(--border-active)] focus:outline-none"
        />
      </div>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm capitalize",
              category === c
                ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((e) => (
          <Link
            key={e.id}
            href={`/exercises/${e.slug}`}
            className="group flex gap-3 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
              <ExerciseImage path={e.cover_image_path} alt={e.name} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-semibold">{e.name}</p>
                {!e.shoulder_safe && (
                  <ShieldAlert className="h-3.5 w-3.5 text-[var(--warning)]" />
                )}
              </div>
              <p className="text-xs capitalize text-[var(--text-muted)]">
                {e.primary_muscles.join(", ")}
              </p>
              <p className="text-xs capitalize text-[var(--text-secondary)]">
                {e.equipment.join(", ")}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="mt-10 text-center text-[var(--text-secondary)]">
          No exercises match your search.
        </p>
      )}
    </div>
  );
}
