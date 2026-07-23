import { requireUser } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { GenerateProgram } from "@/components/coach/generate-program";
import { getTrainingInsights } from "@/lib/actions/ai-coach";
import { chooseDaysPerWeek } from "@/lib/ai/program-generator";
import { Sparkles, TrendingUp, Minus, TrendingDown, Circle, Lock } from "lucide-react";
import type { Trend } from "@/lib/ai/analysis";

export const metadata = { title: "AI Coach" };

const TREND_STYLE: Record<
  Trend,
  { label: string; className: string; icon: typeof TrendingUp }
> = {
  progressing: {
    label: "Progressing",
    className: "bg-[var(--accent-muted)] text-[var(--accent-primary)]",
    icon: TrendingUp,
  },
  plateaued: {
    label: "Plateaued",
    className: "bg-[var(--warning)]/15 text-[var(--warning)]",
    icon: Minus,
  },
  regressing: {
    label: "Slipping",
    className: "bg-[var(--danger)]/15 text-[var(--danger)]",
    icon: TrendingDown,
  },
  building: {
    label: "Building",
    className: "bg-[var(--surface-elevated)] text-[var(--text-muted)]",
    icon: Circle,
  },
};

export default async function AiCoachPage() {
  await requireUser();
  const res = await getTrainingInsights();

  if (!res.ok) {
    return (
      <PageShell>
        <PageHeader title="AI Coach" subtitle="Adaptive programming from your training." />
        <p className="mt-8 text-[var(--text-secondary)]">
          We couldn&apos;t load your training data. Please try again.
        </p>
      </PageShell>
    );
  }

  const { insights, narrative, aiSplitId } = res;
  const c = insights.consistency;

  return (
    <PageShell>
      <PageHeader
        title="AI Coach"
        subtitle="Adaptive programming that learns from your own training."
      />

      {!c.eligible ? (
        <BaselineCard
          progress={c.progress}
          spanDays={c.spanDays}
          sessions={c.completedSessions}
          sessionsNeeded={c.sessionsNeeded}
          weeksWithSessions={c.weeksWithSessions}
        />
      ) : (
        <div className="mt-6 space-y-6">
          {/* Coaching note */}
          {narrative && (
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--accent-primary)]" />
                <p className="font-semibold">Your coach</p>
              </div>
              <p className="mt-2 text-[var(--text-secondary)]">{narrative}</p>
            </div>
          )}

          {/* Consistency stats */}
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Sessions" value={String(c.completedSessions)} />
            <Stat label="Per week" value={c.avgPerWeek.toFixed(1)} />
            <Stat label="Weeks active" value={String(Math.floor(c.spanDays / 7))} />
          </div>

          {/* Generate / regenerate */}
          <GenerateProgram
            suggestedDays={chooseDaysPerWeek(c.avgPerWeek)}
            hasExisting={!!aiSplitId}
            existingSplitId={aiSplitId}
          />

          {/* Per-lift progression */}
          {insights.exercises.length > 0 && (
            <div>
              <h2 className="text-lg font-bold">Your lifts</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Tracked from your logged sets. Estimated 1RM uses the Epley formula.
              </p>
              <div className="mt-3 space-y-2">
                {insights.exercises.slice(0, 20).map((e) => {
                  const style = TREND_STYLE[e.trend];
                  const Icon = style.icon;
                  return (
                    <div
                      key={e.exerciseId}
                      className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">{e.name}</p>
                          <p className="text-xs capitalize text-[var(--text-muted)]">
                            {e.primaryMuscles.join(", ")} · {e.sessions} session
                            {e.sessions === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span
                          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {style.label}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                        {e.bestEst1RM ? <span>Best e1RM {e.bestEst1RM} kg</span> : null}
                        {e.bestWeightKg ? <span>Top set {e.bestWeightKg} kg</span> : null}
                        {e.percentChange !== null ? (
                          <span
                            className={
                              e.percentChange >= 0
                                ? "text-[var(--accent-primary)]"
                                : "text-[var(--danger)]"
                            }
                          >
                            {e.percentChange >= 0 ? "+" : ""}
                            {Math.round(e.percentChange * 100)}% overall
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-primary)]">
                        {e.recommendation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Muscle balance */}
          {(insights.balance.undertrained.length > 0 ||
            insights.balance.overtrained.length > 0) && (
            <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
              <h2 className="text-lg font-bold">Muscle balance</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Working sets by group over the last 4 weeks.
              </p>
              {insights.balance.undertrained.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Give these more attention
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {insights.balance.undertrained.map((m) => (
                      <span
                        key={m}
                        className="rounded-full bg-[var(--warning)]/15 px-3 py-1 text-sm capitalize text-[var(--warning)]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {insights.balance.overtrained.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Well covered
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {insights.balance.overtrained.map((m) => (
                      <span
                        key={m}
                        className="rounded-full bg-[var(--surface-secondary)] px-3 py-1 text-sm capitalize text-[var(--text-secondary)]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function BaselineCard({
  progress,
  spanDays,
  sessions,
  sessionsNeeded,
  weeksWithSessions,
}: {
  progress: number;
  spanDays: number;
  sessions: number;
  sessionsNeeded: number;
  weeksWithSessions: number;
}) {
  const weeks = Math.min(4, Math.floor(spanDays / 7));
  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-6">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-[var(--text-muted)]" />
          <p className="font-semibold">Building your baseline</p>
        </div>
        <p className="mt-2 text-[var(--text-secondary)]">
          Adaptive AI programming unlocks after <strong>4 weeks of consistent
          training</strong>. Keep logging your workouts — weights, reps and sets — and
          your coach will tailor a plan from your own progress.
        </p>

        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{Math.round(progress * 100)}% ready</span>
            <span className="text-[var(--text-muted)]">
              Week {weeks} of 4
            </span>
          </div>
          <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]">
            <div
              className="h-full rounded-full bg-[var(--accent-primary)] transition-all"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="Sessions logged" value={String(sessions)} />
          <Stat label="Weeks trained (of 4)" value={String(weeksWithSessions)} />
          <Stat
            label="Sessions to unlock"
            value={sessionsNeeded > 0 ? String(sessionsNeeded) : "0"}
          />
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        <p className="font-semibold">What it will do</p>
        <ul className="mt-2 space-y-1.5 text-sm text-[var(--text-secondary)]">
          <li>• Track weight, reps and sets on every lift to spot progress and plateaus.</li>
          <li>• Prescribe the next working weight — overload when you&apos;re climbing, deload when you stall.</li>
          <li>• Balance your muscle groups and build a split around how often you actually train.</li>
        </ul>
      </div>
    </div>
  );
}
