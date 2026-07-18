"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateExercise } from "@/lib/actions/admin";
import { VideoManager } from "@/components/admin/video-manager";
import type { Exercise, ExerciseVideo } from "@/lib/types";
import { ArrowLeft } from "lucide-react";

export function ExerciseEditor({
  exercise,
  videos,
}: {
  exercise: Exercise;
  videos: ExerciseVideo[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(exercise.name);
  const [instructions, setInstructions] = useState(exercise.instructions ?? "");
  const [shoulderSafe, setShoulderSafe] = useState(exercise.shoulder_safe);
  const [shoulderNotes, setShoulderNotes] = useState(exercise.shoulder_notes ?? "");
  const [status, setStatus] = useState(exercise.status);

  function save() {
    startTransition(async () => {
      const res = await updateExercise(exercise.id, {
        name,
        instructions,
        shoulder_safe: shoulderSafe,
        shoulder_notes: shoulderNotes,
        status,
      });
      if (res.ok) {
        toast("Exercise saved.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
  }

  return (
    <div>
      <Link
        href="/admin/exercises"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)]"
      >
        <ArrowLeft className="h-4 w-4" /> All exercises
      </Link>
      <h1 className="mt-3 text-2xl font-bold">{exercise.name}</h1>

      <div className="mt-6 space-y-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-secondary)]">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className={cls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-secondary)]">Instructions</span>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            className={cls}
          />
        </label>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Shoulder-safe</p>
            <p className="text-xs text-[var(--text-muted)]">
              Marks whether this movement is safe for a sore shoulder.
            </p>
          </div>
          <button
            onClick={() => setShoulderSafe((s) => !s)}
            className={`h-10 rounded-xl border px-4 text-sm ${
              shoulderSafe
                ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                : "border-[var(--border-subtle)] text-[var(--warning)]"
            }`}
          >
            {shoulderSafe ? "Safe" : "Caution"}
          </button>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-secondary)]">Shoulder notes</span>
          <textarea
            value={shoulderNotes}
            onChange={(e) => setShoulderNotes(e.target.value)}
            rows={2}
            className={cls}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-secondary)]">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Exercise["status"])}
            className={cls}
          >
            {["draft", "review", "published", "archived"].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save exercise"}
        </Button>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-bold">Videos</h2>
        <VideoManager exerciseId={exercise.id} videos={videos} />
      </div>
    </div>
  );
}

const cls =
  "w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2.5 text-sm focus:border-[var(--border-active)] focus:outline-none";
