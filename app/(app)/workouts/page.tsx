import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { CoverImage } from "@/components/ui/cover-image";
import { StartWorkoutButton } from "@/components/start-workout-button";

export const metadata = { title: "Workouts" };

export default async function WorkoutsPage() {
  const { user } = await requireUser();
  const dash = await getDashboardData(user.id);

  if (!dash.enrolment) {
    return (
      <PageShell>
        <PageHeader title="Workouts" />
        <p className="mt-8 text-[var(--text-secondary)]">
          Enrol in a program to see your workouts.{" "}
          <Link href="/programs" className="text-[var(--accent-primary)]">
            Browse programs
          </Link>
          .
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Workouts"
        subtitle={dash.enrolment.program.name}
      />
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {dash.templates.map((t) => {
          const isNext = dash.next?.id === t.id;
          return (
            <div
              key={t.id}
              className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
            >
              <Link href={`/workouts/${t.id}`} className="block">
                <div className="relative h-40 w-full">
                  <CoverImage
                    path={t.cover_image_path}
                    alt={t.name}
                    sizes="(max-width:640px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 to-transparent" />
                  {isNext && (
                    <span className="absolute left-3 top-3 rounded-full bg-[var(--accent-primary)] px-2.5 py-1 text-[11px] font-bold text-black">
                      Up next
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="text-lg font-bold">{t.name}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {t.estimated_minutes} min ·{" "}
                      {t.target_muscle_groups.slice(0, 3).join(" · ")}
                    </p>
                  </div>
                </div>
              </Link>
              <div className="p-3">
                <StartWorkoutButton
                  workoutTemplateId={t.id}
                  existingSessionId={
                    isNext ? (dash.inProgressSession?.id ?? null) : null
                  }
                  className="w-full"
                />
              </div>
            </div>
          );
        })}
      </div>
    </PageShell>
  );
}
