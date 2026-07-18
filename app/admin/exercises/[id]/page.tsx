import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExerciseEditor } from "@/components/admin/exercise-editor";
import type { Exercise, ExerciseVideo } from "@/lib/types";

export default async function AdminExerciseEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!exercise) notFound();

  const { data: videos } = await supabase
    .from("exercise_videos")
    .select("*")
    .eq("exercise_id", id)
    .order("created_at");

  return (
    <ExerciseEditor
      exercise={exercise as Exercise}
      videos={(videos ?? []) as ExerciseVideo[]}
    />
  );
}
