"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Flame,
  MessageCircle,
  MoreHorizontal,
  Send,
  Trash2,
  UserPlus,
  Ban,
  Flag,
  Dumbbell,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import {
  toggleReaction,
  addComment,
  toggleFollow,
  toggleBlock,
  reportPost,
  deletePost,
  type FeedPost,
} from "@/lib/actions/social";

const REACTIONS = ["🔥", "💪", "❤️", "👏", "🤯"] as const;
const REPORT_REASONS = ["spam", "harassment", "nsfw", "misinformation", "other"] as const;

interface Comment {
  id: string;
  body: string;
  authorName: string | null;
  authorId: string;
  createdAt: string;
}

interface PostCardProps {
  post: FeedPost;
  isPro: boolean;
  currentUserId: string;
  onDeleted?: (postId: string) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString();
}

function Avatar({ name, url }: { name: string | null; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name ?? "User"} className="h-10 w-10 rounded-full object-cover" />;
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-muted)] text-sm font-bold text-[var(--accent-primary)]">
      {(name ?? "?").charAt(0).toUpperCase()}
    </span>
  );
}

export function PostCard({ post, isPro, currentUserId, onDeleted }: PostCardProps) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string>(REPORT_REASONS[0]);
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>(post.reactionCounts);
  const [myReactions, setMyReactions] = useState<string[]>(post.currentUserReactions);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [following, setFollowing] = useState(post.author.isFollowing);

  const menuRef = useRef<HTMLDivElement>(null);
  const isAuthor = post.author.id === currentUserId;
  const isFlagged = post.aiModerationStatus === "flagged" || post.aiModerationStatus === "rejected";

  // Resolve signed URL for media (post.mediaUrl is a storage path).
  useEffect(() => {
    let cancelled = false;
    async function resolveMedia() {
      if (!post.mediaUrl || post.mediaType === "none") return;
      // If it already looks like an http URL, use it directly.
      if (/^https?:\/\//i.test(post.mediaUrl)) {
        if (!cancelled) setMediaUrl(post.mediaUrl);
        return;
      }
      // Strip the social-feed:// prefix if present, leaving just the storage path.
      const storagePath = post.mediaUrl.replace(/^social-feed:\/\//, "");
      setMediaLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from("social-feed")
          .createSignedUrl(storagePath, 3600);
        if (!cancelled && !error && data?.signedUrl) {
          setMediaUrl(data.signedUrl);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setMediaLoading(false);
      }
    }
    resolveMedia();
    return () => {
      cancelled = true;
    };
  }, [post.mediaUrl, post.mediaType]);

  // Close menu on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setReportOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (okMsg) toast(okMsg, "success");
        router.refresh();
      } else {
        toast(res.error ?? "Something went wrong", "error");
      }
    });
  }

  function handleReaction(emoji: string) {
    if (!isPro) {
      toast("Reactions are a Pro feature.", "error");
      return;
    }
    // Optimistic update.
    const has = myReactions.includes(emoji);
    setMyReactions((prev) =>
      has ? prev.filter((e) => e !== emoji) : [...prev, emoji]
    );
    setReactionCounts((prev) => {
      const next = { ...prev };
      const cur = next[emoji] ?? 0;
      if (has) {
        if (cur <= 1) delete next[emoji];
        else next[emoji] = cur - 1;
      } else {
        next[emoji] = cur + 1;
      }
      return next;
    });
    act(async () => toggleReaction(post.id, emoji));
  }

  async function loadComments() {
    setCommentsLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("social_comments")
        .select("id, body, user_id, created_at, profiles!social_comments_user_id_fkey(full_name)")
        .eq("post_id", post.id)
        .order("created_at", { ascending: true });
      if (data) {
        const mapped = data.map((c) => {
          const row = c as unknown as {
            id: string;
            body: string;
            user_id: string;
            created_at: string;
            profiles: { full_name: string | null } | null;
          };
          return {
            id: row.id,
            body: row.body,
            authorId: row.user_id,
            authorName: row.profiles?.full_name ?? null,
            createdAt: row.created_at,
          } satisfies Comment;
        });
        setComments(mapped);
      }
    } catch {
      // ignore
    } finally {
      setCommentsLoading(false);
    }
  }

  function toggleComments() {
    if (!showComments && comments.length === 0) {
      loadComments();
    }
    setShowComments((v) => !v);
  }

  function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!isPro) {
      toast("Commenting is a Pro feature.", "error");
      return;
    }
    if (!commentText.trim()) return;
    const body = commentText.trim();
    setCommentText("");
    // Optimistic: add a local comment immediately.
    const optimistic: Comment = {
      id: `temp-${Date.now()}`,
      body,
      authorId: currentUserId,
      authorName: "You",
      createdAt: new Date().toISOString(),
    };
    setComments((prev) => [...prev, optimistic]);
    setCommentCount((c) => c + 1);
    startTransition(async () => {
      const res = await addComment(post.id, body);
      if (res.ok) {
        router.refresh();
      } else {
        // Revert on failure.
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id));
        setCommentCount((c) => c - 1);
        toast(res.error ?? "Could not post comment", "error");
      }
    });
  }

  function handleFollow() {
    if (!isPro) {
      toast("Following is a Pro feature.", "error");
      return;
    }
    setMenuOpen(false);
    setFollowing((v) => !v);
    startTransition(async () => {
      const res = await toggleFollow(post.author.id);
      if (!res.ok) {
        setFollowing((v) => !v);
        toast(res.error ?? "Could not update follow status", "error");
      }
    });
  }

  function handleBlock() {
    setMenuOpen(false);
    if (!confirm("Block this user? You will no longer see their posts.")) return;
    act(async () => toggleBlock(post.author.id), "User blocked.");
  }

  function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setReportOpen(false);
    setMenuOpen(false);
    act(async () => reportPost(post.id, reportReason), "Report submitted. Thank you.");
  }

  function handleDelete() {
    setMenuOpen(false);
    if (!confirm("Delete this post? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deletePost(post.id);
      if (res.ok) {
        toast("Post deleted.", "success");
        if (onDeleted) onDeleted(post.id);
        else router.refresh();
      } else {
        toast(res.error ?? "Could not delete post", "error");
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4">
        <Link href={isAuthor ? "/profile" : `/profile/${post.author.id}`} className="flex items-center gap-3">
          <Avatar name={post.author.name} url={post.author.avatarUrl} />
          <div>
            <p className="text-sm font-semibold leading-tight">
              {post.author.name ?? "Someone"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">{timeAgo(post.createdAt)}</p>
          </div>
        </Link>

        {/* Inline follow button (not shown for own posts) */}
        {!isAuthor && (
          <button
            onClick={handleFollow}
            disabled={pending || !isPro}
            title={isPro ? (following ? "Unfollow" : "Follow") : "Pro feature"}
            className={`hidden shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors sm:inline-flex ${
              following
                ? "border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                : "bg-[var(--accent-primary)] text-black"
            } ${!isPro ? "cursor-not-allowed opacity-50" : ""}`}
          >
            {following ? "Following" : "Follow"}
          </button>
        )}

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            disabled={pending}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--surface-secondary)]"
            aria-label="Post options"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-48 overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-lg">
              {!isAuthor && (
                <>
                  <button
                    onClick={handleFollow}
                    disabled={pending}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[var(--surface-secondary)]"
                  >
                    <UserPlus className="h-4 w-4" />
                    Follow / Unfollow
                    {!isPro && <Lock />}
                  </button>
                  <button
                    onClick={handleBlock}
                    disabled={pending}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[var(--surface-secondary)]"
                  >
                    <Ban className="h-4 w-4" />
                    Block
                  </button>
                  <button
                    onClick={() => setReportOpen((v) => !v)}
                    disabled={pending}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-[var(--surface-secondary)]"
                  >
                    <Flag className="h-4 w-4" />
                    Report
                  </button>
                </>
              )}
              {isAuthor && (
                <button
                  onClick={handleDelete}
                  disabled={pending}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[var(--danger)] hover:bg-[var(--surface-secondary)]"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Report sub-menu */}
      {reportOpen && (
        <form onSubmit={handleReportSubmit} className="mx-4 mb-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Report reason
          </p>
          <div className="flex flex-wrap gap-2">
            {REPORT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReportReason(r)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${
                  reportReason === r
                    ? "bg-[var(--accent-primary)] text-black"
                    : "border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-[var(--danger)] px-3 py-2 text-sm font-semibold text-white"
          >
            <Flag className="h-3.5 w-3.5" /> Submit report
          </button>
        </form>
      )}

      {/* Caption */}
      {post.caption && (
        <p className="px-4 pb-3 text-sm leading-relaxed text-[var(--text-primary)] whitespace-pre-wrap break-words">
          {post.caption}
        </p>
      )}

      {/* Linked workout session */}
      {post.workoutSessionId && (
        <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-2">
          <Dumbbell className="h-4 w-4 text-[var(--accent-primary)]" />
          <span className="text-sm text-[var(--text-secondary)]">Shared a workout session</span>
        </div>
      )}

      {/* Media */}
      {post.mediaType !== "none" && (
        <div className="relative">
          {mediaLoading ? (
            <div className="flex h-64 items-center justify-center bg-[var(--surface-secondary)]">
              <span className="text-sm text-[var(--text-muted)]">Loading media…</span>
            </div>
          ) : mediaUrl ? (
            isFlagged ? (
              <div className="relative">
                <div className="blur-xl">
                  {post.mediaType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={mediaUrl} alt="" className="h-auto max-h-[28rem] w-full object-cover" />
                  ) : (
                    <video src={mediaUrl} className="h-auto max-h-[28rem] w-full object-cover" />
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-xl bg-black/60 px-4 py-2 text-center text-sm font-medium text-white">
                    Content under review
                  </div>
                </div>
              </div>
            ) : post.mediaType === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl} alt={post.caption ?? "Post media"} className="h-auto max-h-[28rem] w-full object-cover" />
            ) : (
              <video src={mediaUrl} controls className="h-auto max-h-[28rem] w-full object-cover" />
            )
          ) : null}
        </div>
      )}

      {/* Reactions */}
      <div className="flex flex-wrap items-center gap-1 px-4 pt-3">
        {REACTIONS.map((emoji) => {
          const count = reactionCounts[emoji] ?? 0;
          const active = myReactions.includes(emoji);
          return (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              disabled={pending}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm transition-colors ${
                active
                  ? "bg-[var(--accent-muted)] ring-1 ring-[var(--accent-primary)]/30"
                  : "hover:bg-[var(--surface-secondary)]"
              } ${!isPro ? "cursor-not-allowed opacity-60" : ""}`}
              title={isPro ? `React with ${emoji}` : "Pro feature"}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="text-xs font-medium text-[var(--text-secondary)]">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Comment toggle */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={toggleComments}
          className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{commentCount} {commentCount === 1 ? "comment" : "comments"}</span>
        </button>
        {!isPro && (
          <span className="text-xs text-[var(--text-muted)]">Pro to comment</span>
        )}
      </div>

      {/* Comment section */}
      {showComments && (
        <div className="border-t border-[var(--border-subtle)] px-4 py-3">
          {/* Comments list */}
          {commentsLoading ? (
            <p className="text-sm text-[var(--text-muted)]">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No comments yet.</p>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="shrink-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-xs font-bold text-[var(--text-secondary)]">
                      {(c.authorName ?? "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 rounded-xl bg-[var(--surface-secondary)] px-3 py-2">
                    <p className="text-xs font-semibold">
                      {c.authorId === currentUserId ? "You" : c.authorName ?? "Someone"}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--text-primary)]">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment input */}
          <form onSubmit={handleSubmitComment} className="mt-3 flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={500}
              placeholder={isPro ? "Write a comment…" : "Upgrade to Pro to comment"}
              disabled={!isPro || pending}
              className="h-10 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!isPro || pending || !commentText.trim()}
              className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--accent-primary)] px-3 text-sm font-semibold text-black disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Lock() {
  return (
    <span className="ml-auto text-[var(--text-muted)]">
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </span>
  );
}
