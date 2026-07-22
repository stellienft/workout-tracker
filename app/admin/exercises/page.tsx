import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/types";
import { ShieldAlert } from "lucide-react";
import { ExerciseImport } from "@/components/admin/exercise-import";

export default async function AdminExercisesPage() {
  const supabase = await createClient();
  const { data: exercises } = await supabase
    .from("exercises")
    .select("*")
    .order("name");

  return (
    <div>
      <h1 className="text-2xl font-bold">Exercises</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Edit instructions, shoulder-safety flags and publication status.
      </p>

      <div className="mt-6">
        <ExerciseImport />
      </div>

      <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-secondary)] text-left text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="p-3">Name</th>
              <th className="hidden p-3 sm:table-cell">Category</th>
              <th className="p-3">Shoulder</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {(exercises as Exercise[] | null)?.map((e) => (
              <tr key={e.id} className="bg-[var(--surface-primary)]">
                <td className="p-3">
                  <Link
                    href={`/admin/exercises/${e.id}`}
                    className="font-medium hover:text-[var(--accent-primary)]"
                  >
                    {e.name}
                  </Link>
                </td>
                <td className="hidden p-3 capitalize text-[var(--text-secondary)] sm:table-cell">
                  {e.category}
                </td>
                <td className="p-3">
                  {e.shoulder_safe ? (
                    <span className="text-[var(--accent-primary)]">Safe</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[var(--warning)]">
                      <ShieldAlert className="h-3.5 w-3.5" /> Caution
                    </span>
                  )}
                </td>
                <td className="p-3 capitalize text-[var(--text-secondary)]">
                  {e.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
