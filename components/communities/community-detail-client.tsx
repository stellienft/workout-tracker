"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Send, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  joinCommunity,
  leaveCommunity,
  deleteCommunity,
  type CommunitySummary,
} from "@/lib/actions/communities";
import { getFeed, createPost, type FeedPost } from "@/lib/actions/social";
import { PostCard } from "@/components/feed/post-card";

const MAX_CAPTION = 2000;

export function CommunityDetailClient({
  community,
  initialPosts,
  isPro,
  currentUserId,
}: {
  community: CommunitySummary;
  initialPosts: FeedPost[];
  isPro: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [isMember, setIsMember] = useState(community.isMember || community.isOwner);
  const [memberCount, setMemberCount] = useState(community.memberCount);
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPosts.length === 20);
  const [loadingMore, setLoadingMore] = useState(false);
  const [caption, setCaption] = useState("");

  function join() {
    setIsMember(true);
    setMemberCount((c) => c + 1);
    startTransition(async () => {
      const res = await joinCommunity(community.id);
      if (!res.ok) {
        setIsMember(false);
        setMemberCount((c) => c - 1);
        toast(res.error ?? "Could not join", "error");
      }
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

  function post(e: React.FormEvent) {
    e.preventDefault();
    if (!caption.trim()) return;
    const body = caption.trim();
    setCaption("");
    startTransition(async () => {
      const res = await createPost({
        caption: body,
        communityId: community.id,
        mediaType: "none",
      });
      if (res.ok) {
        const fresh = await getFeed(1, 20, "discover", community.id);
        setPosts(fresh);
        setPage(1);
        setHasMore(fresh.length === 20);
      } else {
        setCaption(body);
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
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        <h1 className="text-2xl font-extrabold">{community.name}</h1>
        {community.description && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{community.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)]">
            <Users className="h-4 w-4" />
            {memberCount} member{memberCount === 1 ? "" : "s"}
          </span>
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
          ) : (
            <Button onClick={join} disabled={pending} size="sm">
              Join community
            </Button>
          )}
        </div>
      </div>

      {/* Composer (members only) */}
      {isMember ? (
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
          <div className="mt-2 flex justify-end">
            <Button type="submit" disabled={pending || !caption.trim()} size="sm" className="gap-1.5">
              <Send className="h-4 w-4" /> {pending ? "Posting…" : "Post"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] p-4 text-center text-sm text-[var(--text-secondary)]">
          Join this community to post.
        </div>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
          No posts yet. {isMember ? "Start the conversation!" : "Join to start the conversation."}
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
