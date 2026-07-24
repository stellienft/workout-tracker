import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { AchievementsSync } from "@/components/achievements/achievements-sync";
import { ShareAchievement } from "@/components/achievements/share-achievement";
import { loadAchievements } from "@/lib/achievements-loader";
import type { AchGroup, AchIcon } from "@/lib/achievements";
import {
  Flame,
  Medal,
  Dumbbell,
  Repeat,
  Layers,
  Scale,
  Footprints,
  Timer,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export const metadata = { title: "Achievements" };

const ICONS: Record<AchIcon, LucideIcon> = {
  flame: Flame,
  medal: Medal,
  dumbbell: Dumbbell,
  repeat: Repeat,
  layers: Layers,
  scale: Scale,
  footprints: Footprints,
  timer: Timer,
  trophy: Trophy,
};

// Tint per group so the badges read at a glance, like the reference.
const GROUP_TINT: Record<AchGroup, { bg: string; fg: string }> = {
  Streaks: { bg: "bg-orange-500/15", fg: "text-orange-400" },
  Attendance: { bg: "bg-[var(--accent-muted)]", fg: "text-[var(--accent-primary)]" },
  "Personal records": { bg: "bg-blue-500/15", fg: "text-blue-400" },
  Milestones: { bg: "bg-purple-500/15", fg: "text-purple-400" },
  Body: { bg: "bg-teal-500/15", fg: "text-teal-400" },
  Cardio: { bg: "bg-green-500/15", fg: "text-green-400" },
};

const GROUP_ORDER: AchGroup[] = [
  "Streaks",
  "Personal records",
  "Attendance",
  "Milestones",
  "Body",
  "Cardio",
];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AchievementsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const [achievements, { data: earnedRows }] = await Promise.all([
    loadAchievements(supabase, user.id),
    supabase
      .from("user_achievements")
      .select("key, achieved_at")
      .eq("user_id", user.id),
  ]);

  const earnedAtByKey = new Map<string, string>(
    (earnedRows ?? []).map((r) => [r.key as string, r.achieved_at as string])
  );

  // Group for display, preferring the persisted earned date where we have it.
  const groups = GROUP_ORDER.map((g) => ({
    group: g,
    items: achievements
      .filter((a) => a.group === g)
      .map((a) => ({ ...a, shownAt: earnedAtByKey.get(a.key) ?? a.achievedAt })),
  })).filter((g) => g.items.length > 0);

  return (
    <PageShell>
      <AchievementsSync />
      <PageHeader
        title="Achievements"
        subtitle="Streaks, personal records and milestones from your training."
      />

      {achievements.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
            <Trophy className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <p className="mt-4 font-semibold">No milestones yet</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Complete workouts and log your lifts, runs and body weight — your
            streaks and personal records will show up here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((g) => (
            <section key={g.group}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">{g.group}</h2>
                <span className="text-xs text-[var(--text-muted)]">
                  {g.items.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {g.items.map((a) => {
                  const Icon = ICONS[a.icon];
                  const tint = GROUP_TINT[a.group];
                  return (
                    <div
                      key={a.key}
                      className="flex items-center gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
                    >
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tint.bg}`}
                      >
                        <Icon className={`h-6 w-6 ${tint.fg}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-tight">{a.title}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {a.description}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {fmtDate(a.shownAt)}
                        </p>
                      </div>
                      <ShareAchievement
                        group={a.group}
                        title={a.title}
                        description={a.description}
                        dateLabel={fmtDate(a.shownAt)}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}
