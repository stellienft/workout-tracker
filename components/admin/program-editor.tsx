"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  updateProgramFields,
  updateProgramStatus,
  searchExercises,
  swapTemplateExercise,
} from "@/lib/actions/admin";
import type { Program, WorkoutTemplate } from "@/lib/types";
import { ArrowLeft, Repeat, Search } from "lucide-react";

interface TemplateExercise {
  id: string;
  position: number | null;
  sets: number | null;
  rep_target: string | null;
  exercise: {
    id: string;
    name: string;
    primary_muscles: string[];
    source: string | null;
  } | null;
}
type TemplateWithExercises = WorkoutTemplate & { exercises: TemplateExercise[] };

export function ProgramEditor({
  program,
  templates,
}: {
  program: Program;
  templates: TemplateWithExercises[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [f, setF] = useState({
    name: program.name,
    short_description: program.short_description ?? "",
    description: program.description ?? "",
    experience_level: program.experience_level,
    scheduling_mode: program.scheduling_mode,
    duration_weeks: String(program.duration_weeks),
    minimum_days_per_week: String(program.minimum_days_per_week),
    maximum_days_per_week: String(program.maximum_days_per_week),
    estimated_session_minutes: String(program.estimated_session_minutes),
    featured: program.featured,
    safety_notes: program.safety_notes ?? "",
    cover_image_path: program.cover_image_path ?? "",
  });

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) {
    setF((prev) => ({ ...prev, [k]: v }));
  }

  function save() {
    startTransition(async () => {
      const res = await updateProgramFields(program.id, {
        name: f.name,
        short_description: f.short_description,
        description: f.description,
        experience_level: f.experience_level,
        scheduling_mode: f.scheduling_mode,
        duration_weeks: f.duration_weeks,
        minimum_days_per_week: f.minimum_days_per_week,
        maximum_days_per_week: f.maximum_days_per_week,
        estimated_session_minutes: f.estimated_session_minutes,
        featured: f.featured,
        safety_notes: f.safety_notes,
      });
      if (res.ok) {
        toast("Program saved.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
  }

  function changeStatus(status: string) {
    startTransition(async () => {
      const res = await updateProgramStatus(program.id, status);
      if (res.ok) {
        toast(`Program ${status}.`, "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not update status", "error");
      }
    });
  }

  const isDraft = program.status !== "published";

  return (
    <div>
      <Link
        href="/admin/programs"
        className="inline-flex items-center gap-1 text-sm text-[var(--text-secondary)]"
      >
        <ArrowLeft className="h-4 w-4" /> All programs
      </Link>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{program.name}</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Status: <span className="capitalize">{program.status}</span> · v
            {program.version}
          </p>
        </div>
        <div className="flex gap-2">
          {isDraft ? (
            <Button onClick={() => changeStatus("published")} disabled={pending}>
              Publish
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => changeStatus("draft")}
              disabled={pending}
            >
              Unpublish
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => changeStatus("archived")}
            disabled={pending}
          >
            Archive
          </Button>
        </div>
      </div>

      {isDraft && (
        <p className="mt-3 rounded-xl bg-[var(--surface-secondary)] p-3 text-sm text-[var(--warning)]">
          This program is a draft and is not visible to users. Complete the content
          and publish when ready.
        </p>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Field label="Name">
          <input
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Cover image path (Supabase storage)">
          <input
            value={f.cover_image_path}
            onChange={(e) => set("cover_image_path", e.target.value)}
            className={inputCls}
            placeholder="covers/programs/…"
            disabled
          />
        </Field>
        <Field label="Short description">
          <input
            value={f.short_description}
            onChange={(e) => set("short_description", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Experience level">
          <select
            value={f.experience_level}
            onChange={(e) => set("experience_level", e.target.value)}
            className={inputCls}
          >
            {["beginner", "intermediate", "advanced", "all"].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Scheduling mode">
          <select
            value={f.scheduling_mode}
            onChange={(e) =>
              set("scheduling_mode", e.target.value as Program["scheduling_mode"])
            }
            className={inputCls}
          >
            {["sequential", "weekly_split", "calendar"].map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Duration (weeks)">
          <input
            type="number"
            value={f.duration_weeks}
            onChange={(e) => set("duration_weeks", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Min days / week">
          <input
            type="number"
            value={f.minimum_days_per_week}
            onChange={(e) => set("minimum_days_per_week", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Max days / week">
          <input
            type="number"
            value={f.maximum_days_per_week}
            onChange={(e) => set("maximum_days_per_week", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Session minutes">
          <input
            type="number"
            value={f.estimated_session_minutes}
            onChange={(e) => set("estimated_session_minutes", e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Featured on dashboard">
          <button
            onClick={() => set("featured", !f.featured)}
            className={`h-11 rounded-xl border text-sm ${
              f.featured
                ? "border-[var(--border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
            }`}
          >
            {f.featured ? "Featured" : "Not featured"}
          </button>
        </Field>
      </div>

      <div className="mt-4">
        <Field label="Full description">
          <textarea
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            rows={4}
            className={inputCls}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Safety notes">
          <textarea
            value={f.safety_notes}
            onChange={(e) => set("safety_notes", e.target.value)}
            rows={3}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="mt-5">
        <Button onClick={save} disabled={pending} size="lg">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold">Workouts ({templates.length})</h2>
        <p className="mt-0.5 text-sm text-[var(--text-muted)]">
          Swap any exercise for another — use this to fine-tune the GIF exercise
          picks.
        </p>
        <div className="mt-3 space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
            >
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] p-3">
                <p className="font-semibold">{t.name}</p>
                <span className="text-xs capitalize text-[var(--text-muted)]">
                  {t.workout_type}
                  {t.week_position ? ` · wk ${t.week_position}` : ""}
                  {t.is_optional ? " · optional" : ""}
                </span>
              </div>
              {t.exercises.length === 0 ? (
                <p className="p-3 text-sm text-[var(--text-muted)]">No exercises.</p>
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {t.exercises.map((te) => (
                    <ExerciseRow key={te.id} te={te} />
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ExerciseRow({ te }: { te: TemplateExercise }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; name: string; primary_muscles: string[] }[]
  >([]);
  const [pending, startTransition] = useTransition();

  function runSearch(q: string) {
    setQuery(q);
    startTransition(async () => {
      const res = await searchExercises(q);
      if (res.ok) setResults(res.results);
    });
  }

  function openPanel() {
    setOpen(true);
    if (results.length === 0) runSearch("");
  }

  function pick(exerciseId: string) {
    startTransition(async () => {
      const res = await swapTemplateExercise(te.id, exerciseId);
      if (res.ok) {
        toast("Exercise swapped.", "success");
        setOpen(false);
        router.refresh();
      } else {
        toast(res.error ?? "Could not swap", "error");
      }
    });
  }

  const legacy = te.exercise?.source !== "exercisedb";

  return (
    <li className="p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {te.exercise?.name ?? "Unknown exercise"}
            {legacy && (
              <span className="ml-2 rounded bg-[var(--surface-secondary)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--warning)]">
                no GIF
              </span>
            )}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {(te.exercise?.primary_muscles ?? []).join(", ")}
            {te.sets ? ` · ${te.sets} sets` : ""}
            {te.rep_target ? ` × ${te.rep_target}` : ""}
          </p>
        </div>
        <button
          onClick={() => (open ? setOpen(false) : openPanel())}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium hover:border-[var(--border-active)]"
        >
          <Repeat className="h-3.5 w-3.5" /> Swap
        </button>
      </div>

      {open && (
        <div className="mt-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-[var(--text-muted)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              placeholder="Search exercises…"
              className="h-9 flex-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-2.5 text-sm focus:border-[var(--border-active)] focus:outline-none"
            />
          </div>
          <div className="mt-2 max-h-64 overflow-y-auto">
            {results.length === 0 ? (
              <p className="p-2 text-xs text-[var(--text-muted)]">
                {pending ? "Searching…" : "No matches."}
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border-subtle)]">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      onClick={() => pick(r.id)}
                      disabled={pending}
                      className="flex w-full items-center justify-between gap-2 px-2 py-2 text-left hover:bg-[var(--surface-primary)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm">{r.name}</span>
                        <span className="block truncate text-xs text-[var(--text-muted)]">
                          {(r.primary_muscles ?? []).join(", ")}
                        </span>
                      </span>
                      {r.id === te.exercise?.id && (
                        <span className="shrink-0 text-[10px] uppercase text-[var(--accent-primary)]">
                          current
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

const inputCls =
  "h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}
