import Link from "next/link";
import { Target, TrendingDown, TrendingUp } from "lucide-react";

/**
 * Projects when the member reaches their goal weight at their current rate of
 * change. `weeklyRate` is signed kg/week (negative = losing). Given as inputs so
 * the page computes them from whatever trend data it has.
 */
export function GoalProjection({
  currentWeight,
  goalWeight,
  weeklyRate,
}: {
  currentWeight: number | null;
  goalWeight: number | null;
  weeklyRate: number | null;
}) {
  if (currentWeight == null) return null;

  if (goalWeight == null) {
    return (
      <Shell>
        <p className="text-sm text-[var(--text-secondary)]">
          Set a goal weight to see when you&apos;ll reach it at your current pace.
        </p>
        <Link href="/goals" className="mt-2 inline-block text-sm font-medium text-[var(--accent-primary)]">
          Set a goal →
        </Link>
      </Shell>
    );
  }

  const diff = goalWeight - currentWeight; // + = need to gain, − = need to lose
  if (Math.abs(diff) < 0.5) {
    return (
      <Shell>
        <p className="font-semibold">You&apos;re at your goal weight 🎯</p>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          {goalWeight} kg — nice work. Time to set a new target.
        </p>
      </Shell>
    );
  }

  const towardGoal = weeklyRate != null && Math.sign(weeklyRate) === Math.sign(diff);
  const meaningful = weeklyRate != null && Math.abs(weeklyRate) >= 0.05;

  if (weeklyRate == null || !meaningful) {
    return (
      <Shell>
        <p className="font-semibold">Goal: {goalWeight} kg</p>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          {weeklyRate == null
            ? "Log another scan or weigh-in and we'll project your trend."
            : "Your weight is holding steady — no clear trend to project yet."}
        </p>
      </Shell>
    );
  }

  if (!towardGoal) {
    return (
      <Shell tone="warn">
        <p className="font-semibold">Goal: {goalWeight} kg</p>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          You&apos;re trending {weeklyRate < 0 ? "down" : "up"} at{" "}
          {Math.abs(weeklyRate).toFixed(2)} kg/week — away from your goal. Adjust
          training or nutrition to turn it around.
        </p>
      </Shell>
    );
  }

  const weeks = Math.abs(diff) / Math.abs(weeklyRate);
  const eta = new Date(Date.now() + weeks * 7 * 86_400_000);
  const etaLabel = eta.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const weeksLabel = weeks < 1 ? "under a week" : `~${Math.round(weeks)} weeks`;

  return (
    <Shell tone="accent">
      <p className="font-semibold">On track for {goalWeight} kg</p>
      <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
        At {Math.abs(weeklyRate).toFixed(2)} kg/week you&apos;ll get there in{" "}
        <span className="font-semibold text-[var(--text-primary)]">{weeksLabel}</span> —
        around <span className="font-semibold text-[var(--text-primary)]">{etaLabel}</span>.
      </p>
      <p className="mt-1 text-[11px] text-[var(--text-muted)]">
        Now {currentWeight} kg · {Math.abs(diff).toFixed(1)} kg to go
      </p>
    </Shell>
  );
}

function Shell({
  children,
  tone = "plain",
}: {
  children: React.ReactNode;
  tone?: "plain" | "accent" | "warn";
}) {
  const Icon = tone === "warn" ? TrendingUp : tone === "accent" ? TrendingDown : Target;
  const ring =
    tone === "accent"
      ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
      : tone === "warn"
        ? "border-[var(--warning)]/40 bg-[var(--warning)]/10"
        : "border-[var(--border-subtle)] bg-[var(--surface-primary)]";
  return (
    <div className={`flex items-start gap-3 rounded-[var(--radius-card)] border p-5 ${ring}`}>
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-[var(--accent-primary)]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
