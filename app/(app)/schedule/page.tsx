import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StartWorkoutButton } from "@/components/start-workout-button";
import { CoverImage } from "@/components/ui/cover-image";
import { startOfWeek, isoDate } from "@/lib/utils";
import { Check } from "lucide-react";

export const metadata = { title: "Schedule" };

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function SchedulePage() {
  const { user } = await requireUser();
  const dash = await getDashboardData(user.id);
  const supabase = await createClient();

  const weekStart = startOfWeek(new Date());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Completed sessions this week keyed by ISO date.
  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, workout_template_id, status, completed_at, started_at")
    .eq("user_id", user.id)
    .gte("started_at", isoDate(weekStart))
    .order("started_at", { ascending: false });

  const today = isoDate(new Date());
  const doneIds = new Set(dash.completedTemplateIdsThisWeek);
  const requiredTemplates = dash.templates.filter((t) => !t.is_optional);
  const optionalTemplates = dash.templates.filter((t) => t.is_optional);

  return (
    <PageShell>
      <PageHeader
        title="Schedule"
        subtitle={
          dash.enrolment
            ? `${dash.enrolment.program.name} · Week ${dash.enrolment.current_week}`
            : "Enrol in a program to see your week."
        }
      />

      {/* Week strip */}
      <div className="mt-6 grid grid-cols-7 gap-2">
        {days.map((d, i) => {
          const iso = isoDate(d);
          const isToday = iso === today;
          const didWork = (sessions ?? []).some(
            (s) =>
              s.status === "completed" &&
              s.completed_at &&
              isoDate(new Date(s.completed_at)) === iso
          );
          return (
            <div
              key={iso}
              className={`flex flex-col items-center rounded-2xl border p-2 ${
                isToday
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                  : "border-[var(--border-subtle)]"
              }`}
            >
              <span className="text-[10px] uppercase text-[var(--text-muted)]">
                {DAY_LABELS[i]}
              </span>
              <span className="mt-1 text-sm font-bold">{d.getDate()}</span>
              <span className="mt-1 h-2 w-2 rounded-full">
                {didWork ? (
                  <Check className="h-3 w-3 text-[var(--accent-primary)]" />
                ) : null}
              </span>
            </div>
          );
        })}
      </div>

      {!dash.enrolment ? (
        <p className="mt-8 text-[var(--text-secondary)]">
          You&apos;re not enrolled in a program.{" "}
          <Link href="/programs" className="text-[var(--accent-primary)]">
            Browse programs
          </Link>
          .
        </p>
      ) : (
        <>
          {/* Weekly target */}
          <div className="mt-6 flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
            <ProgressRing percent={dash.weekly.percent} size={72} />
            <div>
              <p className="text-lg font-bold">
                {dash.weekly.completed} of {dash.weekly.target} this week
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {dash.weekly.remaining === 0
                  ? "You've hit your weekly target."
                  : `${dash.weekly.remaining} workout${
                      dash.weekly.remaining === 1 ? "" : "s"
                    } remaining`}
              </p>
            </div>
          </div>

          {/* Today's targets / workout list */}
          <h2 className="mt-8 text-lg font-bold">This week&apos;s workouts</h2>
          <div className="mt-3 space-y-3">
            {requiredTemplates.map((t) => {
              const done = doneIds.has(t.id);
              const isNext = dash.next?.id === t.id;
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
                >
                  <div className="relative h-20 w-20 shrink-0">
                    <CoverImage path={t.cover_image_path} alt={t.name} sizes="80px" />
                    {done && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <Check className="h-6 w-6 text-[var(--accent-primary)]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 py-2">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {t.estimated_minutes} min ·{" "}
                      {t.target_muscle_groups.slice(0, 3).join(" · ")}
                    </p>
                  </div>
                  <div className="pr-3">
                    {done ? (
                      <span className="text-xs font-medium text-[var(--accent-primary)]">
                        Complete
                      </span>
                    ) : (
                      <StartWorkoutButton
                        workoutTemplateId={t.id}
                        existingSessionId={
                          isNext ? (dash.inProgressSession?.id ?? null) : null
                        }
                        className="!h-10 !px-3 !text-xs"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {optionalTemplates.length > 0 && (
            <>
              <h2 className="mt-8 text-lg font-bold">Optional sessions</h2>
              <div className="mt-3 space-y-3">
                {optionalTemplates.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
                  >
                    <div className="relative h-20 w-20 shrink-0">
                      <CoverImage path={t.cover_image_path} alt={t.name} sizes="80px" />
                    </div>
                    <div className="min-w-0 flex-1 py-2">
                      <p className="font-semibold">{t.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {t.estimated_minutes} min · optional
                      </p>
                    </div>
                    <div className="pr-3">
                      <StartWorkoutButton
                        workoutTemplateId={t.id}
                        existingSessionId={null}
                        className="!h-10 !px-3 !text-xs"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </PageShell>
  );
}
