import { requireUser } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { OptInToggle } from "@/components/leaderboard/opt-in-toggle";
import { NameToggle } from "@/components/leaderboard/name-toggle";
import {
  getLeaderboardTop,
  getMyStanding,
  getLeaderboardOptIn,
  getLeaderboardNameHidden,
} from "@/lib/leaderboard";
import { Trophy, Flame, CalendarCheck, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata = { title: "Leaderboard" };

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-muted)] text-sm font-bold text-[var(--accent-primary)]">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

const MEDAL = ["🥇", "🥈", "🥉"] as const;

export default async function LeaderboardPage() {
  await requireUser();

  const [rows, me, optedIn, nameHidden] = await Promise.all([
    getLeaderboardTop(50),
    getMyStanding(),
    getLeaderboardOptIn(),
    getLeaderboardNameHidden(),
  ]);

  const segmentNote = me?.isMinor
    ? "Teen board · under 18s"
    : "Weekly · resets Monday";

  return (
    <PageShell>
      <PageHeader
        title="Leaderboard"
        subtitle={`This week · ${segmentNote}`}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <NameToggle hidden={nameHidden} />
            <OptInToggle optedIn={optedIn} />
          </div>
        }
      />

      {/* Your standing */}
      <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        {!optedIn ? (
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-[var(--text-muted)]" />
            <div className="text-sm text-[var(--text-secondary)]">
              You&rsquo;re hidden from the leaderboard. Tap{" "}
              <span className="font-medium text-[var(--text-primary)]">Hidden</span>{" "}
              above to join and see where you rank.
            </div>
          </div>
        ) : me ? (
          <div>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  Your rank this week
                </p>
                <p className="mt-1 text-3xl font-extrabold tabular-nums">
                  #{me.rank}
                  <span className="ml-2 text-base font-medium text-[var(--text-muted)]">
                    of {me.participants}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold tabular-nums text-[var(--accent-primary)]">
                  {me.points.toLocaleString()}
                </p>
                <p className="text-xs text-[var(--text-muted)]">points</p>
              </div>
            </div>
            {me.percentile !== null && (
              <p className="mt-2 text-sm font-medium text-[var(--accent-primary)]">
                Top {me.percentile}%
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]">
              <Chip icon={<CalendarCheck className="h-3.5 w-3.5" />}>
                {me.completedSessions} workout{me.completedSessions === 1 ? "" : "s"}
              </Chip>
              <Chip icon={<Flame className="h-3.5 w-3.5" />}>
                {me.activeDays} active day{me.activeDays === 1 ? "" : "s"}
              </Chip>
              <Chip icon={<Dumbbell className="h-3.5 w-3.5" />}>
                {me.totalSets} sets
              </Chip>
              {me.totalVolumeKg > 0 && (
                <Chip>{Math.round(me.totalVolumeKg).toLocaleString()} kg volume</Chip>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-[var(--accent-primary)]" />
            <div className="text-sm text-[var(--text-secondary)]">
              You&rsquo;re not ranked yet this week. Complete a workout to climb on
              the board — consistency scores more than big numbers.
            </div>
          </div>
        )}
      </div>

      {/* Rankings */}
      {rows.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] py-16 text-center text-sm text-[var(--text-muted)]">
          No one&rsquo;s on the board yet this week. Be the first — finish a workout!
        </div>
      ) : (
        <div className="mt-6 divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
          {rows.map((r) => (
            <div
              key={r.userId}
              className={cn(
                "flex items-center gap-3 px-4 py-3",
                r.isMe && "bg-[var(--accent-muted)]",
              )}
            >
              <div className="w-8 shrink-0 text-center text-sm font-bold tabular-nums text-[var(--text-secondary)]">
                {r.rank <= 3 ? (
                  <span className="text-lg">{MEDAL[r.rank - 1]}</span>
                ) : (
                  r.rank
                )}
              </div>
              <Avatar name={r.name} url={r.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {r.name}
                  {r.isMe && (
                    <span className="ml-2 text-xs font-normal text-[var(--accent-primary)]">
                      You
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {r.completedSessions} workout{r.completedSessions === 1 ? "" : "s"} ·{" "}
                  {r.activeDays} active day{r.activeDays === 1 ? "" : "s"}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-bold tabular-nums">
                  {r.points.toLocaleString()}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  pts
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* How points work */}
      <details className="mt-6 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
        <summary className="cursor-pointer text-sm font-semibold">
          How points work
        </summary>
        <ul className="mt-3 space-y-1.5 text-sm text-[var(--text-secondary)]">
          <li>+50 for each completed workout</li>
          <li>+15 for every day you train this week</li>
          <li>+100 bonus for training 3 or more days</li>
          <li>+2 per set logged (capped per session)</li>
          <li>+10 for logging a warm-up or stretches</li>
          <li>+1 per 1,000 kg of volume (capped, so size never dominates)</li>
        </ul>
        <p className="mt-3 text-xs text-[var(--text-muted)]">
          Scores reset every Monday. Under-18s are ranked only against other
          under-18s. Use the toggles up top to hide yourself from the board, or
          to show a masked name (e.g. I*** H***) instead of your full name.
        </p>
      </details>
    </PageShell>
  );
}

function Chip({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-secondary)] px-3 py-1.5">
      {icon}
      {children}
    </span>
  );
}
