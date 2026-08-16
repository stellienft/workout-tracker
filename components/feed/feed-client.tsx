"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Upload, Send, Lock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import {
  getFeed,
  createPost,
  suggestedUsers,
  toggleFollow,
  type FeedPost,
  type SuggestedUser,
} from "@/lib/actions/social";
import { PostCard } from "@/components/feed/post-card";

type Scope = "discover" | "following";

const BUCKET = "social-feed";
const MAX_CAPTION = 2000;
const MAX_IMAGE = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO = 50 * 1024 * 1024; // 50 MB
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

interface RecentSession {
  id: string;
  label: string;
}

interface FeedClientProps {
  initialPosts: FeedPost[];
  isPro: boolean;
  currentUserId: string;
}

export function FeedClient({ initialPosts, isPro, currentUserId }: FeedClientProps) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPosts.length === 20);
  const [loadingMore, setLoadingMore] = useState(false);

  // Discover (everyone) vs Following (people you follow).
  const [scope, setScope] = useState<Scope>("discover");
  const [switchingScope, setSwitchingScope] = useState(false);

  // Who-to-follow suggestions.
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    suggestedUsers(8).then(setSuggested).catch(() => {});
  }, []);

  async function switchScope(next: Scope) {
    if (next === scope) return;
    setScope(next);
    setSwitchingScope(true);
    try {
      const fresh = await getFeed(1, 20, next);
      setPosts(fresh);
      setPage(1);
      setHasMore(fresh.length === 20);
    } finally {
      setSwitchingScope(false);
    }
  }

  function followSuggested(id: string) {
    setFollowingIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const res = await toggleFollow(id);
      if (!res.ok) {
        setFollowingIds((prev) => {
          const n = new Set(prev);
          n.delete(id);
          return n;
        });
        toast(res.error ?? "Could not follow", "error");
      }
    });
  }

  // Post creation form state
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | "none">("none");
  const [uploading, setUploading] = useState(false);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [sessionsLoaded, setSessionsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function loadRecentSessions() {
    if (sessionsLoaded) return;
    setSessionsLoaded(true);
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("workout_sessions")
          .select("id, started_at, completed_at, status")
          .eq("user_id", currentUserId)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(10);
        if (data) {
          const mapped = data.map((s) => {
            const row = s as { id: string; started_at: string; completed_at: string | null };
            const date = row.completed_at ?? row.started_at;
            return {
              id: row.id,
              label: `Workout — ${new Date(date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}`,
            };
          });
          setRecentSessions(mapped);
        }
      } catch {
        // ignore
      }
    })();
  }

  function handleFilePick(f: File | undefined) {
    if (!f) return;
    const isImage = IMAGE_TYPES.includes(f.type);
    const isVideo = VIDEO_TYPES.includes(f.type);
    if (!isImage && !isVideo) {
      toast("Please upload an image or video.", "error");
      return;
    }
    if (isImage && f.size > MAX_IMAGE) {
      toast("Image is too large (max 10 MB).", "error");
      return;
    }
    if (isVideo && f.size > MAX_VIDEO) {
      toast("Video is too large (max 50 MB).", "error");
      return;
    }
    setFile(f);
    setMediaType(isImage ? "image" : "video");
    setFilePreview(URL.createObjectURL(f));
  }

  function clearMedia() {
    setFile(null);
    setFilePreview(null);
    setMediaType("none");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmitPost(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim() && !file) {
      toast("Add a caption or media to post.", "error");
      return;
    }
    if (caption.length > MAX_CAPTION) {
      toast(`Caption must be ${MAX_CAPTION} characters or fewer.`, "error");
      return;
    }

    startTransition(async () => {
      let mediaPath: string | undefined;

      // Upload file if provided.
      if (file) {
        setUploading(true);
        try {
          const supabase = createClient();
          const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${currentUserId}/${Date.now()}-${cleanName}`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, {
              contentType: file.type || "application/octet-stream",
              upsert: false,
            });
          if (upErr) {
            toast(upErr.message || "Upload failed", "error");
            return;
          }
          // Store the storage path in mediaUrl. PostCard will resolve signed URLs.
          // We encode the path as a regular URL so the server schema's URL
          // validation passes (createPost uses z.string().url()).
          mediaPath = `social-feed://${path}`;
        } catch {
          toast("Upload failed. Please try again.", "error");
          return;
        } finally {
          setUploading(false);
        }
      }

      const res = await createPost({
        caption: caption.trim() || undefined,
        mediaUrl: mediaPath,
        mediaType: mediaType,
        workoutSessionId: selectedSessionId || undefined,
      });

      if (res.ok) {
        toast("Posted!", "success");
        setCaption("");
        clearMedia();
        setSelectedSessionId("");
        // Reload the feed fresh from the server.
        const fresh = await getFeed(1, 20, scope);
        setPosts(fresh);
        setPage(1);
        setHasMore(fresh.length === 20);
      } else {
        toast(res.error ?? "Could not create post", "error");
      }
    });
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const more = await getFeed(next, 20, scope);
      if (more.length === 0) {
        setHasMore(false);
      } else {
        setPosts((prev) => [...prev, ...more]);
        setPage(next);
        if (more.length < 20) setHasMore(false);
      }
    } catch {
      toast("Could not load more posts.", "error");
    } finally {
      setLoadingMore(false);
    }
  }

  const toFollow = suggested.filter((u) => !followingIds.has(u.id)).slice(0, 6);
  function WhoToFollow() {
    if (toFollow.length === 0) return null;
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
        <p className="mb-3 text-sm font-semibold">Who to follow</p>
        <div className="flex flex-col gap-2">
          {toFollow.map((u) => (
            <div key={u.id} className="flex items-center gap-3">
              <Link href={`/profile/${u.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt={u.name ?? "User"} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent-muted)] text-sm font-bold text-[var(--accent-primary)]">
                    {(u.name ?? "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="truncate text-sm font-medium">{u.name ?? "Member"}</span>
              </Link>
              <button
                onClick={() => followSuggested(u.id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)]"
              >
                <UserPlus className="h-3.5 w-3.5" /> Follow
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Following / Discover tabs */}
      <div className="flex gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-1">
        {(["discover", "following"] as Scope[]).map((s) => (
          <button
            key={s}
            onClick={() => switchScope(s)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize transition-colors ${
              scope === s
                ? "bg-[var(--accent-primary)] text-[var(--accent-ink)]"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Post creation form (all members; photo/video is a Pro perk) */}
      {(
        <form
          onSubmit={handleSubmitPost}
          className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
        >
          {/* Caption */}
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
            onFocus={loadRecentSessions}
            placeholder="Share a win, a PR, or a question…"
            rows={3}
            className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <div className="mt-1 text-right text-xs text-[var(--text-muted)]">
            {caption.length}/{MAX_CAPTION}
          </div>

          {/* File preview */}
          {filePreview && mediaType === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={filePreview} alt="Preview" className="mt-2 max-h-48 rounded-xl object-cover" />
          )}
          {filePreview && mediaType === "video" && (
            <video src={filePreview} className="mt-2 max-h-48 rounded-xl" controls />
          )}
          {file && (
            <button
              type="button"
              onClick={clearMedia}
              className="mt-1 text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
            >
              Remove media
            </button>
          )}

          {/* Controls */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={IMAGE_TYPES.concat(VIDEO_TYPES).join(",")}
              className="hidden"
              onChange={(e) => handleFilePick(e.target.files?.[0])}
            />
            {isPro ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={pending || uploading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)]"
              >
                <Upload className="h-4 w-4" /> Add media
              </button>
            ) : (
              <Link
                href="/billing"
                title="Photo & video posts are a Pro feature"
                className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-muted)]"
              >
                <Lock className="h-4 w-4" /> Add media (Pro)
              </Link>
            )}

            {/* Session link */}
            {recentSessions.length > 0 && (
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                disabled={pending}
                className="h-10 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
              >
                <option value="">Link a workout (optional)</option>
                {recentSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}

            <Button
              type="submit"
              disabled={pending || uploading || (!caption.trim() && !file)}
              size="sm"
              className="ml-auto gap-1.5"
            >
              <Send className="h-4 w-4" />
              {uploading ? "Uploading…" : pending ? "Posting…" : "Post"}
            </Button>
          </div>
        </form>
      )}

      {/* Feed list */}
      {switchingScope ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">Loading…</p>
      ) : posts.length === 0 ? (
        <div className="space-y-4">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              {scope === "following"
                ? "Your Following feed is empty — follow a few people to fill it."
                : "No posts yet. Be the first to share something!"}
            </p>
          </div>
          <WhoToFollow />
        </div>
      ) : (
        <div className="space-y-4">
          {scope === "following" && <WhoToFollow />}
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isPro={isPro}
              currentUserId={currentUserId}
              onDeleted={(deletedId) =>
                setPosts((prev) => prev.filter((p) => p.id !== deletedId))
              }
            />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                onClick={loadMore}
                disabled={loadingMore}
                variant="outline"
                size="sm"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
