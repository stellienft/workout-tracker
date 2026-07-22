import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTrainer, getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui/page-header";
import { TrainerProgramEditor } from "@/components/trainer/program-editor";

export const metadata = { title: "Edit program" };

export default async function TrainerProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireTrainer();
  const { user } = await getAuthContext();
  const supabase = await createClient();

  // Confirm the program belongs to this trainer's tenant.
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_user_id", user!.id)
    .maybeSingle();
  if (!tenant) notFound();

  const { data: program } = await supabase
    .from("trainer_programs")
    .select("id, name, description, difficulty, duration_weeks, published")
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!program) notFound();

  const [{ data: rows }, { data: exercises }] = await Promise.all([
    supabase
      .from("trainer_program_exercises")
      .select(
        "id, exercise_id, day_label, position, sets, reps, rest_seconds, exercise:exercises(name, primary_muscles)"
      )
      .eq("trainer_program_id", id)
      .order("day_label", { ascending: true })
      .order("position", { ascending: true }),
    supabase
      .from("exercises")
      .select("id, name, primary_muscles, category")
      .eq("status", "published")
      .order("name")
      .limit(600),
  ]);

  const exerciseRows = (
    (rows ?? []) as unknown as {
      id: string;
      exercise_id: string;
      day_label: string | null;
      position: number;
      sets: number | null;
      reps: string | null;
      rest_seconds: number | null;
      exercise: { name: string; primary_muscles: string[] } | null;
    }[]
  ).map((r) => ({
    id: r.id,
    exerciseId: r.exercise_id,
    dayLabel: r.day_label ?? "Day 1",
    position: r.position,
    sets: r.sets,
    reps: r.reps,
    restSeconds: r.rest_seconds,
    name: r.exercise?.name ?? "Exercise",
    muscles: r.exercise?.primary_muscles ?? [],
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
        href="/trainer"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Trainer Portal
      </Link>
      <TrainerProgramEditor
        programId={program.id}
        programName={program.name}
        published={program.published}
        rows={exerciseRows}
        catalog={catalog}
      />
    </PageShell>
  );
}
