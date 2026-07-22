import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAuthContext } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { getPrimaryGoal, getRecentSessions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui/page-header";
import { TodayHeroCard } from "@/components/dashboard/today-hero";
import { WeeklyCompletionCard } from "@/components/dashboard/weekly-completion";
import { StatCard } from "@/components/ui/card";
import { ProgramCard } from "@/components/program-card";
import { CoverImage } from "@/components/ui/cover-image";
import { formatDuration } from "@/lib/utils";
import type { Program } from "@/lib/types";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const { user } = await requireUser();
  const { profile } = await getAuthContext();
  const supabase = await createClient();

  const [dash, primaryGoal, recent] = await Promise.all([
    getDashboardData(user.id),
    getPrimaryGoal(user.id),
    getRecentSessions(user.id, 5),
  ]);

  // Body-weight trend + workout count stats + split count (for new-user nudge).
  const [{ data: metrics }, { count: totalWorkouts }, { count: splitCount }] =
    await Promise.all([
      supabase
        .from("body_metrics")
        .select("weight_kg, recorded_on")
        .eq("user_id", user.id)
        .not("weight_kg", "is", null)
        .order("recorded_on", { ascending: false })
        .limit(2),
      supabase
        .from("workout_sessions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "completed"),
      supabase
        .from("custom_splits")
        .select("id", { count: "exact", head: true })
        .eq("owner_user_id", user.id),
    ]);

  // Show a gentle "get started" nudge to brand-new members with nothing set up.
  const showStarterNudge =
    !dash.enrolment &&
    !dash.inProgressSession &&
    (totalWorkouts ?? 0) === 0 &&
    (splitCount ?? 0) === 0;

  const latestWeight = metrics?.[0]?.weight_kg ?? null;

  // Discovery: featured programs.
  const { data: featured } = await supabase
    .from("featured_content")
    .select("*")
    .eq("placement", "dashboard_discover")
    .eq("active", true)
    .order("display_order");

  const discoverIds = (featured ?? [])
    .filter((f) => f.content_type === "program" && f.content_id)
    .map((f) => f.content_id);
  let discoverPrograms: Program[] = [];
  if (discoverIds.length) {
    const { data } = await supabase
      .from("programs")
      .select("*")
      .in("id", discoverIds)
      .eq("status", "published");
    discoverPrograms = (data ?? []) as Program[];
  }

  const firstName = (profile?.full_name || "Athlete").split(" ")[0];

  return (
    <PageShell>
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">Welcome back</p>
          <h1 className="text-2xl font-bold sm:text-3xl">{firstName}</h1>
        </div>
        {primaryGoal && (
          <Link
            href="/goals"
            className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
          >
            Goal: <span className="text-[var(--accent-primary)]">{primaryGoal.name}</span>
          </Link>
        )}
      </div>

      {/* New-user nudge: try a ready-made starter split */}
      {showStarterNudge && (
        <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--accent-muted)] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
            New here? Start in seconds
          </p>
          <p className="mt-1 font-bold">Not sure where to begin?</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Pick a ready-made starter split — like Full Body or Push/Pull/Legs —
            already filled with exercises. Customise it or start training right
            away.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/splits"
              className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black"
            >
              Browse starter splits
            </Link>
            <Link
              href="/programs"
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 py-2 text-sm font-medium"
            >
              Or explore programs
            </Link>
          </div>
        </div>
      )}

      {/* Continue unfinished */}
      {dash.inProgressSession && (
        <Link
          href={`/workout/${dash.inProgressSession.id}`}
          className="mt-5 flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--accent-muted)] p-4"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
              Resume workout
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              You have a workout in progress — pick up where you left off.
            </p>
          </div>
          <span className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black">
            Continue
          </span>
        </Link>
      )}

      {/* Hero + weekly */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {dash.enrolment && dash.next ? (
            <TodayHeroCard
              programName={dash.enrolment.program.name}
              workout={dash.next}
              sessionId={dash.inProgressSession?.id ?? null}
              week={dash.enrolment.current_week}
            />
          ) : (
            <NoProgramHero />
          )}
        </div>
        <div>
          {dash.enrolment ? (
            <WeeklyCompletionCard
              week={dash.enrolment.current_week}
              weekly={dash.weekly}
              templates={dash.templates}
              completedIds={dash.completedTemplateIdsThisWeek}
            />
          ) : null}
        </div>
      </div>

      {/* Small stats */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Current weight"
          value={latestWeight ? `${latestWeight} kg` : "—"}
          accent
        />
        <StatCard
          label="Workouts"
          value={String(totalWorkouts ?? 0)}
          sub="completed"
        />
        <StatCard
          label="This week"
          value={`${dash.weekly.completed}/${dash.weekly.target || "—"}`}
          sub="sessions"
        />
        <StatCard
          label="Program week"
          value={dash.enrolment ? String(dash.enrolment.current_week) : "—"}
          sub={dash.enrolment ? `of ${dash.enrolment.program.duration_weeks}` : ""}
        />
      </div>

      {/* Recent activity */}
      {recent.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold">Recent activity</h2>
          <div className="mt-3 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
            {recent.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 text-sm"
              >
                <div>
                  <p className="font-medium capitalize">
                    {s.status === "completed"
                      ? "Completed workout"
                      : s.status === "in_progress"
                        ? "In progress"
                        : "Abandoned"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {new Date(s.started_at).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                {s.total_seconds ? (
                  <span className="text-[var(--text-secondary)]">
                    {formatDuration(s.total_seconds)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Discovery */}
      {discoverPrograms.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Discover programs</h2>
            <Link href="/programs" className="text-sm text-[var(--accent-primary)]">
              See all
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {discoverPrograms.map((p) => (
              <ProgramCard key={p.id} program={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recovery / check-in prompt */}
      <section className="mt-8">
        <Link
          href="/check-ins"
          className="flex items-center justify-between overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5"
        >
          <div>
            <h3 className="font-bold">How are you recovering?</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Log today&apos;s energy, soreness and shoulder status.
            </p>
          </div>
          <span className="rounded-xl bg-[var(--surface-secondary)] px-4 py-2 text-sm">
            Check in
          </span>
        </Link>
      </section>
    </PageShell>
  );
}

function NoProgramHero() {
  return (
    <div className="relative h-72 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
      <CoverImage path={null} alt="Get started" className="" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/30" />
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <h2 className="text-2xl font-bold">Ready to start?</h2>
        <p className="mt-1 max-w-md text-sm text-[var(--text-secondary)]">
          Pick a program that fits your goal and we&apos;ll build your week around
          it.
        </p>
        <Link
          href="/programs"
          className="mt-4 inline-flex w-fit items-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-5 py-3 font-semibold text-black"
        >
          Browse programs
        </Link>
      </div>
    </div>
  );
}
