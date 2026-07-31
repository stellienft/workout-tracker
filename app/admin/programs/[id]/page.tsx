import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProgramEditor } from "@/components/admin/program-editor";
import type { Program, WorkoutTemplate } from "@/lib/types";

export default async function AdminProgramEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!program) notFound();

  const { data: templates } = await supabase
    .from("workout_templates")
    .select("*")
    .eq("program_id", id)
    .order("sequence_order", { ascending: true, nullsFirst: false })
    .order("week_position", { ascending: true, nullsFirst: false });

  const templateIds = (templates ?? []).map((t) => t.id as string);
  const { data: templateExercises } = templateIds.length
    ? await supabase
        .from("workout_template_exercises")
        .select(
          "id, workout_template_id, position, sets, rep_target, superset_group, exercise:exercises(id, name, primary_muscles, source)"
        )
        .in("workout_template_id", templateIds)
        .order("position", { ascending: true })
    : { data: [] };

  type TER = {
    id: string;
    workout_template_id: string;
    position: number | null;
    sets: number | null;
    rep_target: string | null;
    superset_group: number | null;
    exercise: { id: string; name: string; primary_muscles: string[]; source: string | null } | null;
  };
  const exByTemplate = new Map<string, TER[]>();
  for (const raw of (templateExercises ?? []) as unknown as TER[]) {
    const ex = Array.isArray((raw as { exercise: unknown }).exercise)
      ? ((raw as unknown as { exercise: TER["exercise"][] }).exercise[0] ?? null)
      : raw.exercise;
    const row = { ...raw, exercise: ex };
    const arr = exByTemplate.get(raw.workout_template_id) ?? [];
    arr.push(row);
    exByTemplate.set(raw.workout_template_id, arr);
  }

  const templatesWithExercises = (templates ?? []).map((t) => ({
    ...(t as WorkoutTemplate),
    exercises: exByTemplate.get(t.id as string) ?? [],
  }));

  return (
    <ProgramEditor
      program={program as Program}
      templates={templatesWithExercises}
    />
  );
}
