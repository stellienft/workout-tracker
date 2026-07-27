import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { FollowButton } from "@/components/feed/follow-button";
import { Calendar, Dumbbell, Users } from "lucide-react";

export const metadata = { title: "Profile" };

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { user } = await requireUser();
  const { isPro } = await getUserPlan();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, experience_level, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) notFound();

  const isSelf = userId === user.id;

  const [
    { count: sessionCount },
    { count: postCount },
    { count: followersCount },
    { count: followingCount },
    { data: isFollowingRow },
    { data: isBlockedRow },
    { data: latestScan },
  ] = await Promise.all([
    supabase.from("workout_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
    supabase.from("social_posts").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("social_follows").select("id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("social_follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
    supabase.from("social_follows").select("id").eq("follower_id", user.id).eq("following_id", userId).maybeSingle(),
    supabase.from("social_blocks").select("id").eq("blocker_id", user.id).eq("blocked_id", userId).maybeSingle(),
    supabase.from("body_composition_scans").select("scan_date, source, body_fat_pct, muscle_mass_kg, weight_kg, bmi").eq("user_id", userId).order("scan_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  // Recent posts
  const { data: postRows } = await supabase
    .from("social_posts")
    .select("id, caption, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const joinedDate = profile.created_at
    ? new Date(profile.created_at as string).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : null;

  return (
    <PageShell>
      <PageHeader
        title={(profile.full_name as string) ?? "Athlete"}
        subtitle={profile.experience_level ? `${(profile.experience_level as string).charAt(0).toUpperCase()}${(profile.experience_level as string).slice(1)} athlete` : "Athlete"}
      />

      <div className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 sm:flex-row sm:items-start">
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url as string} alt={(profile.full_name as string) ?? "User"} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-muted)] text-2xl font-bold text-[var(--accent-primary)]">
            {((profile.full_name as string) ?? "?").charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold">{(profile.full_name as string) ?? "Athlete"}</p>
              {joinedDate && (
                <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <Calendar className="h-3 w-3" /> Joined {joinedDate}
                </p>
              )}
            </div>
            {!isSelf && (
              <FollowButton
                targetUserId={userId}
                isPro={isPro}
                initialFollowing={!!isFollowingRow}
                initialBlocked={!!isBlockedRow}
              />
            )}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <Stat icon={<Dumbbell className="h-4 w-4" />} label="Workouts" value={sessionCount ?? 0} />
            <Stat icon={<Users className="h-4 w-4" />} label="Posts" value={postCount ?? 0} />
            <Stat icon={<Users className="h-4 w-4" />} label="Followers" value={followersCount ?? 0} />
            <Stat icon={<Users className="h-4 w-4" />} label="Following" value={followingCount ?? 0} />
          </div>

          {isSelf && (
            <Link href="/profile" className="mt-3 inline-block text-sm text-[var(--accent-primary)] underline">
              Edit your profile
            </Link>
          )}
        </div>
      </div>

      {/* Body Composition */}
      {latestScan && (
        <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Body Composition</h2>
            <span className="text-xs text-[var(--text-muted)]">
              {(latestScan as Record<string, unknown>).source as string ?? "Scan"} · {new Date((latestScan as Record<string, unknown>).scan_date as string).toLocaleDateString()}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(latestScan as Record<string, unknown>).body_fat_pct != null && (
              <CompStat label="Body Fat" value={`${Number((latestScan as Record<string, unknown>).body_fat_pct).toFixed(1)}%`} />
            )}
            {(latestScan as Record<string, unknown>).muscle_mass_kg != null && (
              <CompStat label="Muscle Mass" value={`${Number((latestScan as Record<string, unknown>).muscle_mass_kg).toFixed(1)} kg`} />
            )}
            {(latestScan as Record<string, unknown>).weight_kg != null && (
              <CompStat label="Weight" value={`${Number((latestScan as Record<string, unknown>).weight_kg).toFixed(1)} kg`} />
            )}
            {(latestScan as Record<string, unknown>).bmi != null && (
              <CompStat label="BMI" value={Number((latestScan as Record<string, unknown>).bmi).toFixed(1)} />
            )}
          </div>
        </div>
      )}

      <div className="mt-6">
        <h2 className="text-lg font-bold">{isSelf ? "Your posts" : "Posts"}</h2>
        {(!postRows || postRows.length === 0) ? (
          <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">No posts yet.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {postRows.map((post) => (
              <div key={post.id as string} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
                {post.caption && <p className="text-sm text-[var(--text-primary)]">{post.caption as string}</p>}
                <p className="mt-2 text-xs text-[var(--text-muted)]">{new Date(post.created_at as string).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-center">
      <div className="flex items-center justify-center text-[var(--accent-primary)]">{icon}</div>
      <p className="mt-1 text-lg font-bold">{value.toLocaleString()}</p>
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}

function CompStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
