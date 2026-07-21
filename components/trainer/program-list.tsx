"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createTrainerProgram, publishTrainerProgram } from "@/lib/actions/trainer";
import { CoverImage } from "@/components/ui/cover-image";

interface TrainerProgram {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_path: string | null;
  difficulty: string;
  duration_weeks: number;
  published: boolean;
}

export function TrainerProgramList({ tenantId, programs }: { tenantId: string; programs?: TrainerProgram[] }) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [coverImagePath, setCoverImagePath] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced" | "all">("beginner");
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [category, setCategory] = useState("strength");

  function create() {
    startTransition(async () => {
      const res = await createTrainerProgram({
        name,
        description,
        coverImagePath,
        difficulty,
        durationWeeks,
        category,
      });
      if (res.ok) {
        toast("Program created.", "success");
        setName("");
        setDescription("");
        setCoverImagePath("");
        setShowForm(false);
      } else {
        toast(res.error ?? "Could not create", "error");
      }
    });
  }

  function publish(id: string) {
    startTransition(async () => {
      const res = await publishTrainerProgram(id);
      if (res.ok) {
        toast("Program published.", "success");
      } else {
        toast(res.error ?? "Could not publish", "error");
      }
    });
  }

  return (
    <div className="space-y-3">
      {programs && programs.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {programs.map((p) => (
            <div
              key={p.id}
              className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
            >
              <div className="relative h-32 w-full">
                <CoverImage
                  path={p.cover_image_path}
                  alt={p.name}
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{p.name}</h3>
                  {p.published ? (
                    <span className="rounded-full bg-[var(--accent-muted)] px-2 py-0.5 text-xs text-[var(--accent-primary)]">
                      Published
                    </span>
                  ) : (
                    <button
                      onClick={() => publish(p.id)}
                      disabled={pending}
                      className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-xs text-[var(--text-secondary)]"
                    >
                      Publish
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {p.duration_weeks}wk · {p.difficulty}
                </p>
                {p.description && (
                  <p className="mt-2 text-sm text-[var(--text-secondary)] line-clamp-2">
                    {p.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Program name"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={3}
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <input
            value={coverImagePath}
            onChange={(e) => setCoverImagePath(e.target.value)}
            placeholder="Cover image URL (https://…)"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
              className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="all">All levels</option>
            </select>
            <input
              type="number"
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(Number(e.target.value))}
              min={1}
              max={52}
              className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
            />
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category"
              className="h-11 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={create} disabled={pending || !name} size="lg" className="flex-1">
              {pending ? "Creating…" : "Create program"}
            </Button>
            <Button
              onClick={() => setShowForm(false)}
              variant="secondary"
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl border border-dashed border-[var(--border-subtle)] py-4 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-white"
        >
          + Create new program
        </button>
      )}
    </div>
  );
}
