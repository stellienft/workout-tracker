import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { Calendar, Dumbbell, Users, ImageIcon } from "lucide-react";

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

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, experience_level, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) notFound();

  const isSelf = userId === user.id;

  // Fetch stats in parallel
  const [
    { count: sessionCount },
    { count: postCount },
    { count: followersCount },
    { count: followingCount },
    { data: isFollowingRow },
    { data: isBlockedRow },
  ] = await Promise.all([
    supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed"),
    supabase
      .from("social_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("social_follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId),
    supabase
      .from("social_follows")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId),
    supabase
      .from("social_follows")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle(),
    supabase
      .from("social_blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", userId)
      .maybeSingle(),
  ]);

  // Fetch recent posts (up to 10)
  const { data: postRows } = await supabase
    .from("social_posts")
    .select("id, caption, media_url, media_type, created_at, user_id, workout_session_id, ai_moderation_status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch reaction counts and comment counts for these posts
  const postIds = (postRows ?? []).map((p) => p.id as string);
  let reactionMap: Record<string, Record<string, number>> = {};
  let commentCountMap: Record<string, number> = {};
  let userReactionsMap: Record<string, string[]> = {};

  if (postIds.length > 0) {
    const [reactionsData, commentsData, userReactionsData] = await Promise.all([
      supabase
        .from("social_reactions")
        .select("post_id, emoji")
        .in("post_id", postIds),
      supabase
        .from("social_comments")
        .select("post_id")
        .in("post_id", postIds),
      supabase
        .from("social_reactions")
        .select("post_id, emoji")
        .in("post_id", postIds)
        .eq("user_id", user.id),
    ]);

    (reactionsData.data ?? []).forEach((r) => {
      const pid = r.post_id as string;
      const emoji = r.emoji as string;
      if (!reactionMap[pid]) reactionMap[pid] = {};
      reactionMap[pid][emoji] = (reactionMap[pid][emoji] ?? 0) + 1;
    });

    (commentsData.data ?? []).forEach((c) => {
      const pid = c.post_id as string;
      commentCountMap[pid] = (commentCountMap[pid] ?? 0) + 1;
    });

    (userReactionsData.data ?? []).forEach((r) => {
      const pid = r.post_id as string;
      if (!userReactionsMap[pid]) userReactionsMap[pid] = [];
      userReactionsMap[pid].push(r.emoji as string);
    });
  }

  const feedPosts = (postRows ?? []).map((p) => ({
    id: p.id as string,
    caption: p.caption as string | null,
    mediaUrl: p.media_url as string | null,
    mediaType: (p.media_type ?? "none") as "image" | "video" | "none",
    createdAt: p.created_at as string,
    author: {
      id: p.user_id as string,
      name: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      isFollowing: !!isFollowingRow,
    },
    reactionCounts: reactionMap[p.id] ?? {},
    commentCount: commentCountMap[p.id] ?? 0,
    currentUserReactions: userReactionsMap[p.id] ?? [],
    workoutSessionId: p.workout_session_id as string | null,
    aiModerationStatus: (p.ai_moderation_status ?? "pending") as "pending" | "approved" | "flagged" | "rejected",
  }));

  const joinedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <PageShell>
      <PageHeader
        title={profile.full_name ?? "Athlete"}
        subtitle={profile.experience_level
          ? `${profile.experience_level.charAt(0).toUpperCase()}${profile.experience_level.slice(1)} athlete`
          : "Athlete"}
      />

      {/* Profile header card */}
      <div className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 sm:flex-row sm:items-start">
        {/* Avatar */}
        {profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt={profile.full_name ?? "User"}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-muted)] text-2xl font-bold text-[var(--accent-primary)]">
            {(profile.full_name ?? "?").charAt(0).toUpperCase()}
          </div>
        )}

        {/* Info + actions */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold">{profile.full_name ?? "Athlete"}</p>
              {joinedDate && (
                <p className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                  <Calendar className="h-3 w-3" />
                  Joined {joinedDate}
                </p>
              )}
            </div>
            {!isSelf && (
              <span className="text-xs text-[var(--text-muted)]">Follow</span>
            )}
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-4 gap-2">
            <Stat icon={<Dumbbell className="h-4 w-4" />} label="Workouts" value={sessionCount ?? 0} />
            <Stat icon={<ImageIcon className="h-4 w-4" />} label="Posts" value={postCount ?? 0} />
            <Stat icon={<Users className="h-4 w-4" />} label="Followers" value={followersCount ?? 0} />
            <Stat icon={<Users className="h-4 w-4" />} label="Following" value={followingCount ?? 0} />
          </div>

          {isSelf && (
            <Link
              href="/profile"
              className="mt-3 inline-block text-sm text-[var(--accent-primary)] underline"
            >
              Edit your profile
            </Link>
          )}
        </div>
      </div>

      {/* Posts */}
      <div className="mt-6">
        <h2 className="text-lg font-bold">
          {isSelf ? "Your posts" : "Posts"}
        </h2>
        {feedPosts.length === 0 ? (
          <div className="mt-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">No posts yet.</p>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            {feedPosts.map((post) => (
              <div key={post.id} className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
                <div className="flex items-center gap-2">
                  {post.author.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.author.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-muted)] text-xs font-bold text-[var(--accent-primary)]">
                      {(post.author.name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <p className="text-sm font-semibold">{post.author.name ?? "Someone"}</p>
                    <p className="text-xs text-[var(--text-muted)]">{new Date(post.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                {post.caption && (
                  <p className="mt-2 text-sm text-[var(--text-primary)] whitespace-pre-wrap">{post.caption}</p>
                )}
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
