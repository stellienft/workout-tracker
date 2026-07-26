"use client";

import { useState, useTransition } from "react";
import { UserPlus, Ban } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

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

  async function handleFollow() {
    if (!isPro) {
      toast("Following is a Pro feature.", "error");
      return;
    }
    const prev = following;
    setFollowing(!prev);
    try {
      const supabase = createClient();
      if (prev) {
        // Unfollow
        const { error } = await supabase
          .from("social_follows")
          .delete()
          .eq("follower_id", (await supabase.auth.getUser()).data.user?.id ?? "")
          .eq("following_id", targetUserId);
        if (error) {
          setFollowing(prev);
          toast("Could not unfollow.", "error");
        }
      } else {
        // Follow
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;
        const { error } = await supabase
          .from("social_follows")
          .insert({ follower_id: userData.user.id, following_id: targetUserId });
        if (error) {
          setFollowing(prev);
          toast("Could not follow.", "error");
        } else {
          toast("Following!", "success");
        }
      }
    } catch {
      setFollowing(prev);
      toast("Something went wrong.", "error");
    }
  }

  async function handleBlock() {
    const prev = blocked;
    if (!confirm(prev ? "Unblock this user?" : "Block this user? You will no longer see their posts.")) return;
    setBlocked(!prev);
    try {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      if (prev) {
        // Unblock
        const { error } = await supabase
          .from("social_blocks")
          .delete()
          .eq("blocker_id", userData.user.id)
          .eq("blocked_id", targetUserId);
        if (error) {
          setBlocked(prev);
          toast("Could not unblock.", "error");
        } else {
          toast("User unblocked.", "success");
        }
      } else {
        // Block
        const { error } = await supabase
          .from("social_blocks")
          .insert({ blocker_id: userData.user.id, blocked_id: targetUserId });
        if (error) {
          setBlocked(prev);
          toast("Could not block.", "error");
        } else {
          toast("User blocked.", "success");
        }
      }
    } catch {
      setBlocked(prev);
      toast("Something went wrong.", "error");
    }
  }

  if (blocked) {
    return (
      <button
        onClick={handleBlock}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:border-[var(--border-active)]"
      >
        <Ban className="h-3.5 w-3.5" /> Blocked · Unblock
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
            ? "border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
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
