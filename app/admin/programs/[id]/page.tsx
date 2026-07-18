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

  return (
    <ProgramEditor
      program={program as Program}
      templates={(templates ?? []) as WorkoutTemplate[]}
    />
  );
}
