import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui/page-header";
import { ExerciseImage } from "@/components/ui/exercise-image";
import { ExerciseFavoriteButton } from "@/components/exercise-favorite-button";
import { GifDemo } from "@/components/exercise/gif-demo";
import { ExerciseHistory, type HistoryPoint } from "@/components/exercise/exercise-history";
import { getUserPlan } from "@/lib/entitlements";
import { planAllows } from "@/lib/plan";
import { estimate1RM } from "@/lib/ai/analysis";
import { Lock } from "lucide-react";
import { UpgradeButton } from "@/components/billing/billing-actions";
import Link from "next/link";
import type { Exercise } from "@/lib/types";

/** Best estimated-1RM day-by-day from the member's logged sets for this lift. */
function buildHistory(
  logs: { weight_kg: number | null; reps: number | null; created_at: string }[]
): HistoryPoint[] {
  const byDay = new Map<string, HistoryPoint>();
  for (const l of logs) {
    const w = l.weight_kg ?? 0;
    const r = l.reps ?? 0;
    if (w <= 0 || r <= 0) continue;
    const day = l.created_at.slice(0, 10);
    const e1rm = estimate1RM(w, r);
    const cur = byDay.get(day);
    if (!cur || e1rm > cur.e1rm) {
      byDay.set(day, { date: day, e1rm: Math.round(e1rm), top: w, reps: r });
    }
  }
  return Array.from(byDay.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user } = await requireUser();
  const { plan } = await getUserPlan();
  const canSeeStats = planAllows(plan, "advanced_stats");
  const supabase = await createClient();

  const { data: exercise } = await supabase
    .from("exercises")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (!exercise) notFound();
  const e = exercise as Exercise;

  const [{ data: alts }, { data: fav }, { data: setLogs }] =
    await Promise.all([
      supabase
        .from("exercise_alternatives")
        .select(
          "alternative:exercises!exercise_alternatives_alternative_exercise_id_fkey(name, slug)"
        )
        .eq("exercise_id", e.id)
        .order("priority"),
      supabase
        .from("exercise_favorites")
        .select("exercise_id")
        .eq("user_id", user.id)
        .eq("exercise_id", e.id)
        .maybeSingle(),
      supabase
        .from("set_logs")
        .select("weight_kg, reps, created_at")
        .eq("user_id", user.id)
        .eq("exercise_id", e.id)
        .eq("completed", true)
        .order("created_at", { ascending: true })
        .limit(2000),
    ]);

  const history = buildHistory(
    (setLogs ?? []) as {
      weight_kg: number | null;
      reps: number | null;
      created_at: string;
    }[]
  );

  return (
    <PageShell>
      <div className="flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl">
          <ExerciseImage path={e.cover_image_path} alt={e.name} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-2xl font-bold">{e.name}</h1>
            <ExerciseFavoriteButton exerciseId={e.id} initial={!!fav} />
          </div>
          <p className="mt-1 text-sm capitalize text-[var(--text-secondary)]">
            {e.primary_muscles.join(", ")}
            {e.secondary_muscles.length
              ? ` · ${e.secondary_muscles.join(", ")}`
              : ""}
          </p>
          <p className="text-xs capitalize text-[var(--text-muted)]">
            {e.equipment.join(", ")} · {e.difficulty}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <GifDemo path={e.cover_image_path} name={e.name} />
      </div>

      {history.length > 0 &&
        (canSeeStats ? (
          <ExerciseHistory points={history} />
        ) : (
          <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[var(--text-muted)]" />
              <p className="font-semibold">Your history for this lift</p>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              See your PR, estimated 1RM and progression chart for every exercise
              with Stellio Fit Pro.
            </p>
            <div className="mt-3">
              <UpgradeButton label="Unlock with Pro" />
            </div>
          </div>
        ))}

      {e.instructions && (
        <div className="mt-6">
          <h2 className="text-lg font-bold">How to do it</h2>
          <p className="mt-2 text-[var(--text-secondary)]">{e.instructions}</p>
        </div>
      )}

      {e.technique_cues.length > 0 && (
        <div className="mt-4">
          <h3 className="font-semibold">Technique cues</h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-[var(--text-secondary)]">
            {e.technique_cues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {alts && alts.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-bold">Alternatives</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {alts.map((a, i) => {
              const alt = a.alternative as unknown as {
                name: string;
                slug: string;
              };
              return (
                <Link
                  key={i}
                  href={`/exercises/${alt.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-sm"
                >
                  {alt.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
