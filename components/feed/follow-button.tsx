"use client";

import { useState, useTransition } from "react";
import { UserPlus, Ban } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { toggleFollow, toggleBlock } from "@/lib/actions/social";

export function FollowButton({
  targetUserId,
  isPro,
  initialFollowing,
  initialBlocked,
}: {
  targetUserId: string;
  isPro: boolean;
  initialFollowing: boolean;
  initialBlocked: boolean;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [following, setFollowing] = useState(initialFollowing);
  const [blocked, setBlocked] = useState(initialBlocked);

  function handleFollow() {
    if (!isPro) {
      toast("Following is a Pro feature.", "error");
      return;
    }
    setFollowing((v) => !v);
    startTransition(async () => {
      const res = await toggleFollow(targetUserId);
      if (!res.ok) {
        setFollowing((v) => !v);
        toast(res.error ?? "Could not update follow status", "error");
      }
    });
  }

  function handleBlock() {
    if (!confirm(blocked ? "Unblock this user?" : "Block this user? You will no longer see their posts.")) return;
    setBlocked((v) => !v);
    startTransition(async () => {
      const res = await toggleBlock(targetUserId);
      if (!res.ok) {
        setBlocked((v) => !v);
        toast(res.error ?? "Could not update block status", "error");
      } else {
        toast(blocked ? "User unblocked." : "User blocked.", "success");
      }
    });
  }

  if (blocked) {
    return (
      <button
        onClick={handleBlock}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:border-[var(--border-active)]"
      >
        <Ban className="h-3.5 w-3.5" /> Blocked
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleFollow}
        disabled={pending || !isPro}
        title={isPro ? (following ? "Unfollow" : "Follow") : "Pro feature"}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
          following
            ? "border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--danger)]"
            : "bg-[var(--accent-primary)] text-black"
        } ${!isPro ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <UserPlus className="h-3.5 w-3.5" />
        {following ? "Following" : "Follow"}
      </button>
      <button
        onClick={handleBlock}
        disabled={pending}
        className="inline-flex items-center justify-center rounded-xl border border-[var(--border-subtle)] px-2.5 py-1.5 text-[var(--text-muted)] hover:border-[var(--border-active)]"
        title="Block user"
      >
        <Ban className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
