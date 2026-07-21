import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui/page-header";
import { SplitBuilder } from "@/components/splits/split-builder";

export const metadata = { title: "Edit split" };

export default async function SplitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: split } = await supabase
    .from("custom_splits")
    .select("id, name, description")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!split) notFound();

  const [{ data: days }, { data: exercises }] = await Promise.all([
    supabase
      .from("custom_split_days")
      .select(
        "id, day_number, name, focus_muscles, notes, custom_split_day_exercises(id, exercise_id, sets, rep_target, rest_seconds, position, exercise:exercises(name, primary_muscles))"
      )
      .eq("split_id", id)
      .order("day_number"),
    supabase
      .from("exercises")
      .select("id, name, primary_muscles, category")
      .eq("status", "published")
      .order("name")
      .limit(600),
  ]);

  const dayList = (days ?? []).map((d) => ({
    id: d.id as string,
    dayNumber: d.day_number as number,
    name: d.name as string,
    focusMuscles: (d.focus_muscles ?? []) as string[],
    notes: (d.notes ?? null) as string | null,
    exercises: (
      (d.custom_split_day_exercises ?? []) as unknown as {
        id: string;
        exercise_id: string;
        sets: number;
        rep_target: string | null;
        rest_seconds: number;
        position: number;
        exercise: { name: string; primary_muscles: string[] } | null;
      }[]
    )
      .sort((a, b) => a.position - b.position)
      .map((e) => ({
        id: e.id,
        exerciseId: e.exercise_id,
        name: e.exercise?.name ?? "Exercise",
        muscles: e.exercise?.primary_muscles ?? [],
        sets: e.sets,
        repTarget: e.rep_target,
        restSeconds: e.rest_seconds,
      })),
  }));

  const catalog = (exercises ?? []).map((e) => ({
    id: e.id as string,
    name: e.name as string,
    muscles: (e.primary_muscles ?? []) as string[],
    category: (e.category ?? "") as string,
  }));

  return (
    <PageShell>
      <Link
        href="/splits"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> My Splits
      </Link>
      <SplitBuilder
        splitId={split.id}
        splitName={split.name}
        days={dayList}
        catalog={catalog}
      />
    </PageShell>
  );
}
