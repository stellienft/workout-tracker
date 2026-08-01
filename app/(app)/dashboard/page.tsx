import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getAuthContext } from "@/lib/auth";
import { getDashboardData } from "@/lib/dashboard";
import { getPrimaryGoal, getRecentSessions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { PageShell } from "@/components/ui/page-header";
import { TodayHeroCard } from "@/components/dashboard/today-hero";
import { WeeklyCompletionCard } from "@/components/dashboard/weekly-completion";
import { StreakCard } from "@/components/dashboard/streak-card";
import { WeeklyRecapCard } from "@/components/dashboard/weekly-recap-card";
import { ResumeBanner } from "@/components/dashboard/resume-banner";
import { computeStreak } from "@/lib/streak";
import { getCachedRecap } from "@/lib/actions/recap";
import { quoteForDate } from "@/lib/quotes";
import { StatCard } from "@/components/ui/card";
import { CoverImage } from "@/components/ui/cover-image";
import { formatDuration } from "@/lib/utils";

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
  const [{ data: metrics }, { count: totalWorkouts }, { count: splitCount }, { data: scanWeights }] =
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
      // Body-composition scans also carry a weight; surface it if it's the most
      // recent reading (a scan saved before we mirrored weight into body_metrics
      // would otherwise never show here).
      supabase
        .from("body_composition_scans")
        .select("weight_kg, scan_date")
        .eq("user_id", user.id)
        .not("weight_kg", "is", null)
        .order("scan_date", { ascending: false })
        .limit(1),
    ]);

  // Show a gentle "get started" nudge to brand-new members with nothing set up.
  const showStarterNudge =
    !dash.enrolment &&
    !dash.inProgressSession &&
    (totalWorkouts ?? 0) === 0 &&
    (splitCount ?? 0) === 0;

  // Current weight = the most recent reading from either body_metrics or a body
  // composition scan (dates are YYYY-MM-DD, so string compare is chronological).
  const metricRow = metrics?.[0] ?? null;
  const scanRow = scanWeights?.[0] ?? null;
  let latestWeight = (metricRow?.weight_kg as number | null) ?? null;
  if (
    scanRow?.weight_kg != null &&
    (!metricRow || String(scanRow.scan_date) >= String(metricRow.recorded_on))
  ) {
    latestWeight = scanRow.weight_kg as number;
  }

  // Workout streak: completed-session dates over the last ~6 weeks.
  const { data: streakSessions } = await supabase
    .from("workout_sessions")
    .select("completed_at")
    .eq("user_id", user.id)
    .eq("status", "completed")
    .gte("completed_at", new Date(Date.now() - 45 * 86_400_000).toISOString())
    .order("completed_at", { ascending: false });
  const streak = computeStreak(
    (streakSessions ?? []).map((s) => s.completed_at as string),
    profile?.timezone || "Australia/Brisbane"
  );

  // Splits aren't part of the program engine, so surface them separately: any
  // in-progress split session (to resume) plus the member's splits to launch.
  const [{ data: mySplits }, { data: splitSession }] = await Promise.all([
    supabase
      .from("custom_splits")
      .select("id, name, custom_split_days(id)")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("workout_sessions")
      .select("id, started_at, custom_split_days(name, custom_splits(name))")
      .eq("user_id", user.id)
      .eq("status", "in_progress")
      .not("custom_split_day_id", "is", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const splits = (mySplits ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    dayCount: Array.isArray(s.custom_split_days) ? s.custom_split_days.length : 0,
  }));
  const splitDay = splitSession
    ? Array.isArray(splitSession.custom_split_days)
      ? splitSession.custom_split_days[0]
      : splitSession.custom_split_days
    : null;
  const splitParent = splitDay
    ? Array.isArray(splitDay.custom_splits)
      ? splitDay.custom_splits[0]
      : splitDay.custom_splits
    : null;

  const firstName = (profile?.full_name || "Athlete").split(" ")[0];
  const quote = quoteForDate();
  const cachedRecap = await getCachedRecap();

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

      {/* Quote of the day */}
      {profile?.daily_quote_enabled !== false && (
        <figure className="mt-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <blockquote className="text-sm italic text-[var(--text-secondary)]">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
          <figcaption className="mt-1 text-xs text-[var(--text-muted)]">
            — {quote.author}
          </figcaption>
        </figure>
      )}

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
              className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-[var(--accent-ink)]"
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

      {/* Resume an in-progress split workout (outside the program engine) */}
      {splitSession && (
        <ResumeBanner
          sessionId={splitSession.id as string}
          kicker="Resume split workout"
          detail={`${splitParent?.name ? `${splitParent.name} · ` : ""}${
            splitDay?.name ?? "In progress"
          } — pick up where you left off.`}
        />
      )}

      {/* Continue unfinished */}
      {dash.inProgressSession && (
        <ResumeBanner
          sessionId={dash.inProgressSession.id}
          kicker="Resume workout"
          detail="You have a workout in progress — pick up where you left off."
        />
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

      <div className="flex flex-wrap items-center justify-between gap-2">
        <StreakCard streak={streak} />
        {dash.enrolment && (
          <Link
            href="/programs/current"
            className="text-sm text-[var(--accent-primary)]"
          >
            Manage program
          </Link>
        )}
      </div>

      {/* Your splits — show two, link out for the rest */}
      {splits.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Your splits</h2>
            <Link href="/splits" className="text-sm text-[var(--accent-primary)]">
              Manage
            </Link>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {splits.slice(0, 2).map((s) => (
              <Link
                key={s.id}
                href={`/splits/${s.id}`}
                className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 transition-colors hover:border-[var(--border-active)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{s.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {s.dayCount} day{s.dayCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="shrink-0 rounded-xl bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)]">
                  Start
                </span>
              </Link>
            ))}
          </div>
          {splits.length > 2 && (
            <Link
              href="/splits"
              className="mt-3 flex w-full items-center justify-center rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] py-3 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
            >
              View all {splits.length} splits
            </Link>
          )}
        </section>
      )}

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

      {/* Weekly AI recap — moved to the bottom to keep the top focused. */}
      <div className="mt-8">
        <WeeklyRecapCard initial={cachedRecap} />
      </div>

      {/* Recovery / check-in prompt */}
      <section className="mt-8">
        <Link
          href="/check-ins"
          className="flex items-center justify-between gap-4 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5"
        >
          <div className="min-w-0">
            <h3 className="font-bold">How are you recovering?</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Log today&apos;s energy, soreness and recovery.
            </p>
          </div>
          <span className="shrink-0 whitespace-nowrap rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-ink)]">
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
      <div className="on-media absolute inset-0 flex flex-col justify-end p-6">
        <h2 className="text-2xl font-bold">Ready to start?</h2>
        <p className="mt-1 max-w-md text-sm text-[var(--text-secondary)]">
          Pick a program that fits your goal and we&apos;ll build your week around
          it.
        </p>
        <Link
          href="/programs"
          className="mt-4 inline-flex w-fit items-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-5 py-3 font-semibold text-[var(--accent-ink)]"
        >
          Browse programs
        </Link>
      </div>
    </div>
  );
}
