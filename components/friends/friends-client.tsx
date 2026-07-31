"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus, Check, X, Trophy, Share2, Flame, Download, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
  shareSplitWithFriend,
  importSharedWorkout,
} from "@/lib/actions/friends";

interface FriendRow {
  friendship_id: string;
  other_user_id: string;
  other_name: string | null;
  other_email: string | null;
  status: string;
  direction: "friend" | "incoming" | "outgoing";
}
interface BoardRow {
  user_id: string;
  full_name: string | null;
  sessions_7d: number;
  sessions_30d: number;
  total_sessions: number;
  last_session_at: string | null;
}
interface ShareRow {
  id: string;
  name: string;
  from_name: string | null;
  created_at: string;
}
interface SplitOpt {
  id: string;
  name: string;
}

export function FriendsClient({
  myId,
  isPro,
  friends,
  board,
  shares,
  mySplits,
}: {
  myId: string;
  isPro: boolean;
  friends: FriendRow[];
  board: BoardRow[];
  shares: ShareRow[];
  mySplits: SplitOpt[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [shareFor, setShareFor] = useState<string | null>(null);

  const incoming = friends.filter((f) => f.direction === "incoming");
  const outgoing = friends.filter((f) => f.direction === "outgoing");
  const accepted = friends.filter((f) => f.direction === "friend");
  const ranked = [...board].sort(
    (a, b) => b.sessions_7d - a.sessions_7d || b.sessions_30d - a.sessions_30d
  );

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (ok) toast(ok, "success");
        router.refresh();
      } else {
        toast(res.error ?? "Something went wrong", "error");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Add a friend */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
        <p className="font-semibold">Add a friend</p>
        <div className="mt-3 flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              email &&
              act(async () => {
                const r = await sendFriendRequest(email);
                if (r.ok) setEmail("");
                return r;
              }, "Friend request sent.")
            }
            type="email"
            placeholder="friend@email.com"
            className="h-11 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <Button
            onClick={() =>
              act(async () => {
                const r = await sendFriendRequest(email);
                if (r.ok) setEmail("");
                return r;
              }, "Friend request sent.")
            }
            disabled={pending || !email}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">Requests</h2>
          <div className="mt-3 space-y-2">
            {incoming.map((f) => (
              <div
                key={f.friendship_id}
                className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
              >
                <div>
                  <p className="font-medium">{f.other_name || f.other_email}</p>
                  <p className="text-xs text-[var(--text-muted)]">wants to be friends</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => act(() => respondFriendRequest(f.friendship_id, true), "Friend added!")}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)]"
                  >
                    <Check className="h-4 w-4" /> Accept
                  </button>
                  <button
                    onClick={() => act(() => respondFriendRequest(f.friendship_id, false))}
                    disabled={pending}
                    className="inline-flex items-center rounded-xl border border-[var(--border-subtle)] px-3 py-2 text-sm text-[var(--text-secondary)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Leaderboard upsell for free members */}
      {!isPro && (
        <section>
          <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-[var(--text-muted)]" />
              <p className="font-semibold">Compete &amp; share with Pro</p>
            </div>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Unlock the friends leaderboard and share your workouts with friends.
            </p>
            <Link
              href="/billing"
              className="mt-3 inline-flex items-center justify-center rounded-2xl bg-[var(--accent-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-ink)]"
            >
              Upgrade to Pro
            </Link>
          </div>
        </section>
      )}

      {/* Leaderboard */}
      {isPro && ranked.length > 1 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Trophy className="h-5 w-5 text-[var(--accent-primary)]" /> This week
          </h2>
          <div className="mt-3 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
            {ranked.map((r, i) => (
              <div
                key={r.user_id}
                className={`flex items-center gap-3 border-b border-[var(--border-subtle)] p-3 last:border-0 ${
                  r.user_id === myId ? "bg-[var(--accent-muted)]" : "bg-[var(--surface-primary)]"
                }`}
              >
                <span className="w-6 text-center text-sm font-bold text-[var(--text-muted)]">
                  {i + 1}
                </span>
                <span className="flex-1 font-medium">
                  {r.user_id === myId ? "You" : r.full_name || "Friend"}
                </span>
                {r.sessions_7d > 0 && i === 0 && (
                  <Flame className="h-4 w-4 text-[var(--accent-primary)]" />
                )}
                <span className="text-sm">
                  <span className="font-bold">{r.sessions_7d}</span>
                  <span className="text-xs text-[var(--text-muted)]"> this wk</span>
                </span>
                <span className="w-16 text-right text-xs text-[var(--text-muted)]">
                  {r.sessions_30d} / 30d
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Shared with you */}
      {isPro && shares.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">Shared with you</h2>
          <div className="mt-3 space-y-2">
            {shares.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
              >
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    from {s.from_name || "a friend"}
                  </p>
                </div>
                <button
                  onClick={() => act(() => importSharedWorkout(s.id), "Added to your splits.")}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent-primary)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)]"
                >
                  <Download className="h-4 w-4" /> Add
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends */}
      <section>
        <h2 className="text-lg font-bold">Your friends</h2>
        {accepted.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            No friends yet. Add someone by email above.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {accepted.map((f) => (
              <div
                key={f.friendship_id}
                className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{f.other_name || f.other_email}</p>
                  <div className="flex items-center gap-2">
                    {isPro && mySplits.length > 0 && (
                      <button
                        onClick={() =>
                          setShareFor(shareFor === f.other_user_id ? null : f.other_user_id)
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs hover:border-[var(--border-active)]"
                      >
                        <Share2 className="h-3.5 w-3.5" /> Share workout
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Remove ${f.other_name || f.other_email || "this friend"}? You'll need to add each other again to reconnect.`
                          )
                        ) {
                          act(() => removeFriend(f.friendship_id), "Friend removed.");
                        }
                      }}
                      disabled={pending}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {shareFor === f.other_user_id && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-3">
                    {mySplits.map((s) => (
                      <button
                        key={s.id}
                        onClick={() =>
                          act(async () => {
                            const r = await shareSplitWithFriend({
                              splitId: s.id,
                              toUserId: f.other_user_id,
                            });
                            if (r.ok) setShareFor(null);
                            return r;
                          }, "Workout shared!")
                        }
                        disabled={pending}
                        className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs hover:border-[var(--border-active)]"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {outgoing.length > 0 && (
          <div className="mt-3 space-y-2">
            {outgoing.map((f) => (
              <div
                key={f.friendship_id}
                className="flex items-center justify-between rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] p-4 text-sm"
              >
                <span className="text-[var(--text-secondary)]">
                  {f.other_name || f.other_email}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)]">Pending…</span>
                  <button
                    onClick={() => {
                      if (confirm('Cancel this friend request?'))
                        act(() => removeFriend(f.friendship_id));
                    }}
                    disabled={pending}
                    className="text-xs text-[var(--text-muted)] hover:text-[var(--danger)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
