"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Upload, Send, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { getFeed, createPost } from "@/lib/actions/social";
import type { FeedPost } from "@/lib/actions/social";
import { PostCard } from "@/components/feed/post-card";

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
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPosts.length === 20);
  const [loadingMore, setLoadingMore] = useState(false);

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
    if (!isPro) return;
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
        router.refresh();
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
      const more = await getFeed(next, 20);
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

  return (
    <div className="space-y-6">
      {/* Free member banner */}
      {!isPro && (
        <div className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--accent-muted)] p-4">
          <Lock className="h-5 w-5 shrink-0 text-[var(--accent-primary)]" />
          <p className="flex-1 text-sm text-[var(--text-secondary)]">
            Free members can browse the feed.{" "}
            <Link href="/billing" className="font-semibold text-[var(--accent-primary)] underline">
              Upgrade to Pro to post, comment, and react.
            </Link>
          </p>
        </div>
      )}

      {/* Post creation form (Pro only) */}
      {isPro && (
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pending || uploading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)]"
            >
              <Upload className="h-4 w-4" /> Add media
            </button>

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
      {posts.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No posts yet. {isPro ? "Be the first to share something!" : "Check back soon."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isPro={isPro}
              currentUserId={currentUserId}
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
