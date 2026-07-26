"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALLOWED_EMOJIS = ["🔥", "💪", "❤️", "👏", "🤯"] as const;
type AllowedEmoji = (typeof ALLOWED_EMOJIS)[number];

const REPORT_REASONS = [
  "spam",
  "harassment",
  "nsfw",
  "misinformation",
  "other",
] as const;

const MEDIA_TYPES = ["image", "video", "none"] as const;

// ---------------------------------------------------------------------------
// Types (returned by getFeed)
// ---------------------------------------------------------------------------

export interface FeedPost {
  id: string;
  caption: string | null;
  mediaUrl: string | null;
  mediaType: "image" | "video" | "none";
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
  reactionCounts: Record<string, number>;
  commentCount: number;
  currentUserReactions: string[];
  workoutSessionId: string | null;
  aiModerationStatus: "pending" | "approved" | "flagged" | "rejected";
}

// ---------------------------------------------------------------------------
// 1. createPost
// ---------------------------------------------------------------------------

const createPostSchema = z.object({
  caption: z.string().max(2000).optional().default(""),
  mediaUrl: z.string().url().optional().or(z.literal("")),
  mediaType: z.enum(MEDIA_TYPES).default("none"),
  workoutSessionId: z.string().uuid().optional(),
});

export async function createPost(input: {
  caption?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "none";
  workoutSessionId?: string;
}) {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false as const, error: "Posting to the feed is a Pro feature." };

  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { caption, mediaUrl, mediaType, workoutSessionId } = parsed.data;

  const { data, error } = await supabase
    .from("social_posts")
    .insert({
      user_id: user.id,
      caption: caption || null,
      media_url: mediaUrl || null,
      media_type: mediaType,
      workout_session_id: workoutSessionId ?? null,
      ai_moderation_status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false as const, error: error?.message ?? "Failed to create post" };

  const postId = data.id;

  // Kick off AI moderation (fire-and-forget; fail-open).
  moderatePost(postId, caption || "").catch(() => {});

  revalidatePath("/feed");
  return { ok: true as const, postId };
}

// ---------------------------------------------------------------------------
// 2. deletePost
// ---------------------------------------------------------------------------

export async function deletePost(postId: string) {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = z.string().uuid().safeParse(postId);
  if (!parsed.success) return { ok: false as const, error: "Invalid post ID" };

  const { error } = await supabase
    .from("social_posts")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", user.id); // only own posts

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/feed");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 3. addComment
// ---------------------------------------------------------------------------

export async function addComment(postId: string, body: string) {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false as const, error: "Commenting is a Pro feature." };

  const parsed = z
    .object({ postId: z.string().uuid(), body: z.string().min(1).max(500) })
    .safeParse({ postId, body });
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const { error } = await supabase.from("social_comments").insert({
    post_id: parsed.data.postId,
    user_id: user.id,
    body: parsed.data.body,
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/feed");
  revalidatePath(`/feed/${parsed.data.postId}`);
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 4. deleteComment
// ---------------------------------------------------------------------------

export async function deleteComment(commentId: string) {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = z.string().uuid().safeParse(commentId);
  if (!parsed.success) return { ok: false as const, error: "Invalid comment ID" };

  const { error } = await supabase
    .from("social_comments")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", user.id); // only own comments

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/feed");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 5. toggleReaction
// ---------------------------------------------------------------------------

export async function toggleReaction(postId: string, emoji: string) {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false as const, error: "Reactions are a Pro feature." };

  const parsed = z
    .object({ postId: z.string().uuid(), emoji: z.enum(ALLOWED_EMOJIS) })
    .safeParse({ postId, emoji });
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  // Check existing reaction.
  const { data: existing } = await supabase
    .from("social_reactions")
    .select("id")
    .eq("post_id", parsed.data.postId)
    .eq("user_id", user.id)
    .eq("emoji", parsed.data.emoji)
    .maybeSingle();

  if (existing) {
    // Toggle off — remove.
    const { error } = await supabase
      .from("social_reactions")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    // Toggle on — insert.
    const { error } = await supabase.from("social_reactions").insert({
      post_id: parsed.data.postId,
      user_id: user.id,
      emoji: parsed.data.emoji as AllowedEmoji,
    });
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath("/feed");
  revalidatePath(`/feed/${parsed.data.postId}`);
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 6. toggleFollow
// ---------------------------------------------------------------------------

export async function toggleFollow(targetUserId: string) {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false as const, error: "Following is a Pro feature." };

  const parsed = z.string().uuid().safeParse(targetUserId);
  if (!parsed.success) return { ok: false as const, error: "Invalid user ID" };
  const target = parsed.data;

  if (target === user.id) return { ok: false as const, error: "You can't follow yourself." };

  const { data: existing } = await supabase
    .from("social_follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("followee_id", target)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("social_follows")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/feed");
    return { ok: true as const, following: false };
  } else {
    const { error } = await supabase.from("social_follows").insert({
      follower_id: user.id,
      followee_id: target,
    });
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/feed");
    return { ok: true as const, following: true };
  }
}

// ---------------------------------------------------------------------------
// 7. toggleBlock
// ---------------------------------------------------------------------------

export async function toggleBlock(targetUserId: string) {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  // Blocking is available to all authenticated users (not just Pro).
  const parsed = z.string().uuid().safeParse(targetUserId);
  if (!parsed.success) return { ok: false as const, error: "Invalid user ID" };
  const target = parsed.data;

  if (target === user.id) return { ok: false as const, error: "You can't block yourself." };

  const { data: existing } = await supabase
    .from("social_blocks")
    .select("id")
    .eq("blocker_id", user.id)
    .eq("blocked_id", target)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("social_blocks")
      .delete()
      .eq("id", existing.id);
    if (error) return { ok: false as const, error: error.message };
    revalidatePath("/feed");
    return { ok: true as const, blocked: false };
  } else {
    const { error } = await supabase.from("social_blocks").insert({
      blocker_id: user.id,
      blocked_id: target,
    });
    if (error) return { ok: false as const, error: error.message };

    // Also remove any follow relationship (both directions) when blocking.
    await supabase
      .from("social_follows")
      .delete()
      .or(`and(follower_id.eq.${user.id},followee_id.eq.${target}),and(follower_id.eq.${target},followee_id.eq.${user.id})`);

    revalidatePath("/feed");
    return { ok: true as const, blocked: true };
  }
}

// ---------------------------------------------------------------------------
// 8. reportPost
// ---------------------------------------------------------------------------

export async function reportPost(postId: string, reason: string, detail?: string) {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = z
    .object({
      postId: z.string().uuid(),
      reason: z.enum(REPORT_REASONS),
      detail: z.string().max(500).optional().or(z.literal("")),
    })
    .safeParse({ postId, reason, detail });
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const { error } = await supabase.from("social_reports").insert({
    post_id: parsed.data.postId,
    reporter_id: user.id,
    reason: parsed.data.reason,
    detail: parsed.data.detail || null,
  });

  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/feed");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// 9. getFeed  (server action — returns data, no revalidate)
// ---------------------------------------------------------------------------

export async function getFeed(page = 1, perPage = 20): Promise<FeedPost[]> {
  const { supabase, user } = await getAuthContext();
  if (!user) return [];

  // --- 1. Gather blocked user IDs (both directions) ---
  const [blockedByMe, blockedMe] = await Promise.all([
    supabase.from("social_blocks").select("blocked_id").eq("blocker_id", user.id),
    supabase.from("social_blocks").select("blocker_id").eq("blocked_id", user.id),
  ]);

  const blockedIds = new Set<string>();
  (blockedByMe.data ?? []).forEach((r: Record<string, unknown>) => blockedIds.add(r.blocked_id as string));
  (blockedMe.data ?? []).forEach((r: Record<string, unknown>) => blockedIds.add(r.blocker_id as string));
  // Also hide own posts? No — the user should see their own posts.
  // But blockedIds already includes people the user blocked and people who blocked the user.

  const offset = (page - 1) * perPage;

  // --- 2. Fetch posts (exclude blocked users) ---
  let postsQuery = supabase
    .from("social_posts")
    .select(
      `
      id,
      caption,
      media_url,
      media_type,
      created_at,
      user_id,
      workout_session_id,
      ai_moderation_status,
      profiles!social_posts_user_id_fkey ( id, full_name, avatar_url )
    `,
    )
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (blockedIds.size > 0) {
    const blockedFilter = Array.from(blockedIds).join(",");
    postsQuery = postsQuery.not("user_id", "in", `(${blockedFilter})`);
  }

  const { data: posts, error: postsError } = await postsQuery;

  if (postsError || !posts || posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);

  // --- 3. Fetch reaction counts, comment counts, and current user's reactions in parallel ---
  const [reactionsData, commentCountsData, userReactionsData] = await Promise.all([
    // Reaction counts grouped by post + emoji
    supabase
      .from("social_reactions")
      .select("post_id, emoji")
      .in("post_id", postIds),
    // Comment counts per post
    supabase
      .from("social_comments")
      .select("post_id")
      .in("post_id", postIds),
    // Current user's reactions
    supabase
      .from("social_reactions")
      .select("post_id, emoji")
      .in("post_id", postIds)
      .eq("user_id", user.id),
  ]);

  // Aggregate reaction counts: { postId: { emoji: count } }
  const reactionCountsMap: Record<string, Record<string, number>> = {};
  (reactionsData.data ?? []).forEach((r) => {
    const pid = r.post_id as string;
    const emoji = r.emoji as string;
    if (!reactionCountsMap[pid]) reactionCountsMap[pid] = {};
    reactionCountsMap[pid][emoji] = (reactionCountsMap[pid][emoji] ?? 0) + 1;
  });

  // Aggregate comment counts: { postId: count }
  const commentCountMap: Record<string, number> = {};
  (commentCountsData.data ?? []).forEach((c) => {
    const pid = c.post_id as string;
    commentCountMap[pid] = (commentCountMap[pid] ?? 0) + 1;
  });

  // Current user's reactions: { postId: string[] }
  const userReactionsMap: Record<string, string[]> = {};
  (userReactionsData.data ?? []).forEach((r) => {
    const pid = r.post_id as string;
    if (!userReactionsMap[pid]) userReactionsMap[pid] = [];
    userReactionsMap[pid].push(r.emoji as string);
  });

  // --- 4. Assemble final FeedPost[] ---
  return posts.map((p) => {
    const profile = (p as unknown as { profiles: { id: string; full_name: string | null; avatar_url: string | null } | null }).profiles;
    return {
      id: p.id as string,
      caption: p.caption as string | null,
      mediaUrl: p.media_url as string | null,
      mediaType: (p.media_type ?? "none") as "image" | "video" | "none",
      createdAt: p.created_at as string,
      author: {
        id: profile?.id ?? (p.user_id as string),
        name: profile?.full_name ?? null,
        avatarUrl: profile?.avatar_url ?? null,
      },
      reactionCounts: reactionCountsMap[p.id] ?? {},
      commentCount: commentCountMap[p.id] ?? 0,
      currentUserReactions: userReactionsMap[p.id] ?? [],
      workoutSessionId: p.workout_session_id as string | null,
      aiModerationStatus: (p.ai_moderation_status ?? "pending") as "pending" | "approved" | "flagged" | "rejected",
    } satisfies FeedPost;
  });
}

// ---------------------------------------------------------------------------
// 10. moderatePost  (AI moderation via Claude / Anthropic API)
// ---------------------------------------------------------------------------

async function moderatePost(postId: string, caption: string): Promise<void> {
  const supabase = await createClient();

  // Fail open: if no API key, approve immediately.
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await supabase
      .from("social_posts")
      .update({ ai_moderation_status: "approved" })
      .eq("id", postId);
    return;
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 100,
        system:
          "You are a content moderation assistant for a fitness social app. " +
          "Review the user's post caption for: NSFW content, spam, harassment, " +
          "or illegal content. Respond with ONLY a JSON object: " +
          '{"status": "approved" | "flagged" | "rejected", "reason": "brief explanation"}. ' +
          "Use 'approved' for clean content, 'flagged' for borderline content that needs human review, " +
          "and 'rejected' for clearly violating content.",
        messages: [
          {
            role: "user",
            content: `Review this post caption:\n\n"${caption}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      // Fail open on API errors.
      await supabase
        .from("social_posts")
        .update({ ai_moderation_status: "approved" })
        .eq("id", postId);
      return;
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text ?? "";
    let status: "approved" | "flagged" | "rejected" = "approved";

    // Parse the JSON response from Claude.
    try {
      const parsed = JSON.parse(text);
      if (parsed.status === "rejected") status = "rejected";
      else if (parsed.status === "flagged") status = "flagged";
      else status = "approved";
    } catch {
      // If Claude didn't return valid JSON, fail open.
      status = "approved";
    }

    await supabase
      .from("social_posts")
      .update({ ai_moderation_status: status })
      .eq("id", postId);
  } catch {
    // Fail open on any unexpected error.
    await supabase
      .from("social_posts")
      .update({ ai_moderation_status: "approved" })
      .eq("id", postId);
  }
}
