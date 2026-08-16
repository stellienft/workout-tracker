"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Users,
  Send,
  Check,
  Trash2,
  Lock,
  X,
  Upload,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CoverImage } from "@/components/ui/cover-image";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import {
  joinCommunity,
  leaveCommunity,
  deleteCommunity,
  approveMember,
  removeMember,
  updateCommunity,
  type CommunitySummary,
  type PendingMember,
} from "@/lib/actions/communities";
import { getFeed, createPost, type FeedPost } from "@/lib/actions/social";
import { PostCard } from "@/components/feed/post-card";
import { COMMUNITY_COVERS } from "@/lib/community-covers";

const MAX_CAPTION = 2000;
const BUCKET = "social-feed";
const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 50 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export function CommunityDetailClient({
  community,
  initialPosts,
  initialPending,
  isPro,
  currentUserId,
}: {
  community: CommunitySummary;
  initialPosts: FeedPost[];
  initialPending: PendingMember[];
  isPro: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [isMember, setIsMember] = useState(community.isMember || community.isOwner);
  const [isPendingReq, setIsPendingReq] = useState(community.isPending);
  const [requests, setRequests] = useState<PendingMember[]>(initialPending);
  const [memberCount, setMemberCount] = useState(community.memberCount);
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPosts.length === 20);
  const [loadingMore, setLoadingMore] = useState(false);

  // Composer state.
  const [caption, setCaption] = useState("");
  const [anon, setAnon] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | "none">("none");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Owner settings.
  const [showSettings, setShowSettings] = useState(false);
  const [sName, setSName] = useState(community.name);
  const [sDesc, setSDesc] = useState(community.description ?? "");
  const [sPrivacy, setSPrivacy] = useState(community.privacy);
  const [sPolicy, setSPolicy] = useState(community.postPolicy);
  const [sAllowMedia, setSAllowMedia] = useState(community.allowMedia);
  const [sCover, setSCover] = useState(community.coverImagePath ?? COMMUNITY_COVERS[0]);

  const canPost = isMember && (community.postPolicy === "members" || community.isOwner);
  const canAttachMedia = isPro && community.allowMedia;

  function join() {
    startTransition(async () => {
      const res = await joinCommunity(community.id);
      if (res.ok) {
        if (res.pending) {
          setIsPendingReq(true);
          toast("Request sent — the owner will review it.", "success");
        } else {
          setIsMember(true);
          setMemberCount((c) => c + 1);
        }
      } else {
        toast(res.error ?? "Could not join", "error");
      }
    });
  }

  function cancelRequest() {
    setIsPendingReq(false);
    startTransition(async () => {
      await leaveCommunity(community.id);
    });
  }

  function approve(userId: string) {
    setRequests((prev) => prev.filter((r) => r.userId !== userId));
    setMemberCount((c) => c + 1);
    startTransition(async () => {
      const res = await approveMember(community.id, userId);
      if (!res.ok) toast(res.error ?? "Could not approve", "error");
    });
  }

  function reject(userId: string) {
    setRequests((prev) => prev.filter((r) => r.userId !== userId));
    startTransition(async () => {
      await removeMember(community.id, userId);
    });
  }

  function leave() {
    setIsMember(false);
    setMemberCount((c) => c - 1);
    startTransition(async () => {
      const res = await leaveCommunity(community.id);
      if (!res.ok) {
        setIsMember(true);
        setMemberCount((c) => c + 1);
        toast(res.error ?? "Could not leave", "error");
      }
    });
  }

  function remove() {
    if (!confirm("Delete this community? All its posts will be removed. This can't be undone."))
      return;
    startTransition(async () => {
      const res = await deleteCommunity(community.id);
      if (res.ok) {
        toast("Community deleted.", "success");
        router.push("/communities");
      } else {
        toast(res.error ?? "Could not delete", "error");
      }
    });
  }

  function saveSettings() {
    startTransition(async () => {
      const res = await updateCommunity(community.id, {
        name: sName.trim(),
        description: sDesc.trim(),
        privacy: sPrivacy,
        postPolicy: sPolicy,
        allowMedia: sAllowMedia,
        coverImagePath: sCover,
      });
      if (res.ok) {
        toast("Settings saved.", "success");
        setShowSettings(false);
        router.refresh();
      } else {
        toast(res.error ?? "Could not save", "error");
      }
    });
  }

  function handleFilePick(f?: File) {
    if (!f) return;
    const isImage = IMAGE_TYPES.includes(f.type);
    const isVideo = VIDEO_TYPES.includes(f.type);
    if (!isImage && !isVideo) return toast("Upload an image or video.", "error");
    if (isImage && f.size > MAX_IMAGE) return toast("Image too large (max 10 MB).", "error");
    if (isVideo && f.size > MAX_VIDEO) return toast("Video too large (max 50 MB).", "error");
    setFile(f);
    setMediaType(isImage ? "image" : "video");
    setPreview(URL.createObjectURL(f));
  }

  function clearMedia() {
    setFile(null);
    setPreview(null);
    setMediaType("none");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function post(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim() && !file) return;
    const body = caption.trim();
    startTransition(async () => {
      let mediaPath: string | undefined;
      let mType: "image" | "video" | "none" = "none";
      if (file) {
        setUploading(true);
        try {
          const supabase = createClient();
          const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
          const path = `${currentUserId}/${Date.now()}-${clean}`;
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
          mediaPath = `social-feed://${path}`;
          mType = mediaType;
        } catch {
          toast("Upload failed.", "error");
          return;
        } finally {
          setUploading(false);
        }
      }
      const res = await createPost({
        caption: body || undefined,
        communityId: community.id,
        mediaType: mType,
        mediaUrl: mediaPath,
        isAnonymous: anon,
      });
      if (res.ok) {
        setCaption("");
        setAnon(false);
        clearMedia();
        const fresh = await getFeed(1, 20, "discover", community.id);
        setPosts(fresh);
        setPage(1);
        setHasMore(fresh.length === 20);
      } else {
        toast(res.error ?? "Could not post", "error");
      }
    });
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const more = await getFeed(next, 20, "discover", community.id);
      if (more.length === 0) setHasMore(false);
      else {
        setPosts((prev) => [...prev, ...more]);
        setPage(next);
        if (more.length < 20) setHasMore(false);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link
        href="/communities"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> All communities
      </Link>

      {/* Header */}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]">
        {community.coverImagePath && (
          <div className="relative aspect-[3/1] w-full">
            <CoverImage path={community.coverImagePath} alt={community.name} sizes="100vw" />
          </div>
        )}
        <div className="p-5">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold">
            {community.privacy === "private" && (
              <Lock className="h-5 w-5 text-[var(--text-muted)]" />
            )}
            {community.name}
          </h1>
          {community.description && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{community.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
              <Users className="h-4 w-4" />
              {memberCount} member{memberCount === 1 ? "" : "s"}
              {community.privacy === "private" && " · Private"}
            </span>
            <div className="flex items-center gap-2">
              {community.isOwner && (
                <button
                  onClick={() => setShowSettings((v) => !v)}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-active)]"
                >
                  <Settings className="h-4 w-4" /> Settings
                </button>
              )}
              {community.isOwner ? (
                <button
                  onClick={remove}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              ) : isMember ? (
                <button
                  onClick={leave}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
                >
                  <Check className="h-4 w-4" /> Joined
                </button>
              ) : isPendingReq ? (
                <button
                  onClick={cancelRequest}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]"
                >
                  Request pending
                </button>
              ) : (
                <Button onClick={join} disabled={pending} size="sm">
                  {community.privacy === "private" ? "Request to join" : "Join community"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Owner settings */}
      {community.isOwner && showSettings && (
        <div className="space-y-4 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <p className="font-semibold">Community settings</p>
          <label className="block">
            <span className="text-xs text-[var(--text-secondary)]">Name</span>
            <input
              value={sName}
              onChange={(e) => setSName(e.target.value.slice(0, 80))}
              className="mt-1 h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-[var(--text-secondary)]">Description</span>
            <textarea
              value={sDesc}
              onChange={(e) => setSDesc(e.target.value.slice(0, 1000))}
              rows={2}
              className="mt-1 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
            />
          </label>

          <SettingToggle
            label="Private community"
            hint="People request to join and you approve them."
            checked={sPrivacy === "private"}
            onChange={(v) => setSPrivacy(v ? "private" : "public")}
          />
          <SettingToggle
            label="Only I can post"
            hint="Members can still react and comment."
            checked={sPolicy === "owner"}
            onChange={(v) => setSPolicy(v ? "owner" : "members")}
          />
          <SettingToggle
            label="Allow photo & video posts"
            hint="Turn off to keep this a text-only community."
            checked={sAllowMedia}
            onChange={setSAllowMedia}
          />

          <div>
            <span className="text-xs text-[var(--text-secondary)]">Cover image</span>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {COMMUNITY_COVERS.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setSCover(url)}
                  className={`relative aspect-[3/2] overflow-hidden rounded-xl border-2 ${
                    sCover === url ? "border-[var(--accent-primary)]" : "border-transparent"
                  }`}
                >
                  <CoverImage path={url} alt="Cover option" sizes="120px" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveSettings} disabled={pending} size="sm">
              {pending ? "Saving…" : "Save settings"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Pending join requests (owner) */}
      {community.isOwner && requests.length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <p className="mb-3 text-sm font-semibold">Join requests ({requests.length})</p>
          <div className="flex flex-col gap-2">
            {requests.map((r) => (
              <div key={r.userId} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-xs font-bold text-[var(--accent-primary)]">
                  {(r.name ?? "?").charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {r.name ?? "Member"}
                </span>
                <button
                  onClick={() => approve(r.userId)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-ink)]"
                >
                  <Check className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  onClick={() => reject(r.userId)}
                  disabled={pending}
                  aria-label="Reject"
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:text-[var(--danger)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Composer */}
      {canPost ? (
        <form
          onSubmit={post}
          className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
        >
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
            placeholder={`Share something with ${community.name}…`}
            rows={3}
            className="w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />

          {preview && mediaType === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Preview" className="mt-2 max-h-48 rounded-xl object-cover" />
          )}
          {preview && mediaType === "video" && (
            <video src={preview} className="mt-2 max-h-48 rounded-xl" controls />
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

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canAttachMedia && (
              <>
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
              </>
            )}
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-[var(--text-secondary)]">
              <input
                type="checkbox"
                checked={anon}
                onChange={(e) => setAnon(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border-subtle)]"
              />
              Post anonymously
            </label>
            <Button
              type="submit"
              disabled={pending || uploading || (!caption.trim() && !file)}
              size="sm"
              className="ml-auto gap-1.5"
            >
              <Send className="h-4 w-4" /> {uploading ? "Uploading…" : pending ? "Posting…" : "Post"}
            </Button>
          </div>
        </form>
      ) : isMember && community.postPolicy === "owner" ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] p-4 text-center text-sm text-[var(--text-secondary)]">
          Only the owner posts in this community. You can react and comment.
        </div>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] p-4 text-center text-sm text-[var(--text-secondary)]">
          Join this community to post.
        </div>
      )}

      {/* Posts */}
      {community.privacy === "private" && !isMember ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] p-8 text-center">
          <Lock className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            This is a private community.{" "}
            {isPendingReq ? "Your request is pending approval." : "Join to see and share posts."}
          </p>
        </div>
      ) : posts.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
          No posts yet. {canPost ? "Start the conversation!" : "Nothing here yet."}
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              isPro={isPro}
              currentUserId={currentUserId}
              onDeleted={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button onClick={loadMore} disabled={loadingMore} variant="outline" size="sm">
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SettingToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[var(--accent-primary)]" : "bg-[var(--surface-elevated)]"
        }`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
