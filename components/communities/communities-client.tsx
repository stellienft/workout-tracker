"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Users, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  createCommunity,
  joinCommunity,
  leaveCommunity,
  type CommunitySummary,
} from "@/lib/actions/communities";

export function CommunitiesClient({ initial }: { initial: CommunitySummary[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [communities, setCommunities] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function create() {
    if (name.trim().length < 2) {
      toast("Give your community a name.", "error");
      return;
    }
    startTransition(async () => {
      const res = await createCommunity({ name: name.trim(), description: description.trim() });
      if (res.ok && res.slug) {
        toast("Community created!", "success");
        router.push(`/communities/${res.slug}`);
      } else {
        toast(res.error ?? "Could not create", "error");
      }
    });
  }

  function toggleMembership(c: CommunitySummary) {
    const joining = !c.isMember;
    // Optimistic.
    setCommunities((prev) =>
      prev.map((x) =>
        x.id === c.id
          ? { ...x, isMember: joining, memberCount: x.memberCount + (joining ? 1 : -1) }
          : x
      )
    );
    startTransition(async () => {
      const res = joining ? await joinCommunity(c.id) : await leaveCommunity(c.id);
      if (!res.ok) {
        // Revert.
        setCommunities((prev) =>
          prev.map((x) =>
            x.id === c.id
              ? { ...x, isMember: !joining, memberCount: x.memberCount + (joining ? -1 : 1) }
              : x
          )
        );
        toast(res.error ?? "Could not update", "error");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Create */}
      {creating ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <p className="mb-3 font-semibold">Create a community</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 80))}
            placeholder="Community name (e.g. GLP-1 Warriors)"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 1000))}
            rows={2}
            placeholder="What's this community about? (optional)"
            className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <div className="mt-3 flex gap-2">
            <Button onClick={create} disabled={pending} size="sm">
              {pending ? "Creating…" : "Create community"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] py-4 text-sm font-medium text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
        >
          <Plus className="h-4 w-4" /> Create a community
        </button>
      )}

      {/* List */}
      {communities.length === 0 ? (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
          No communities yet. Be the first to start one!
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {communities.map((c) => (
            <div
              key={c.id}
              className="flex flex-col rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
            >
              <Link href={`/communities/${c.slug}`} className="min-w-0 flex-1">
                <p className="truncate font-bold">{c.name}</p>
                {c.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--text-secondary)]">
                    {c.description}
                  </p>
                )}
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <Users className="h-3.5 w-3.5" />
                  {c.memberCount} member{c.memberCount === 1 ? "" : "s"}
                </p>
              </Link>
              <div className="mt-3 flex gap-2">
                <Link
                  href={`/communities/${c.slug}`}
                  className="flex-1 rounded-xl border border-[var(--border-subtle)] py-2 text-center text-sm font-medium hover:border-[var(--border-active)]"
                >
                  View
                </Link>
                {c.isOwner ? (
                  <span className="rounded-xl bg-[var(--surface-secondary)] px-3 py-2 text-sm font-medium text-[var(--text-muted)]">
                    Owner
                  </span>
                ) : (
                  <button
                    onClick={() => toggleMembership(c)}
                    disabled={pending}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ${
                      c.isMember
                        ? "border border-[var(--border-subtle)] text-[var(--text-secondary)]"
                        : "bg-[var(--accent-primary)] text-[var(--accent-ink)]"
                    }`}
                  >
                    {c.isMember ? (
                      <>
                        <Check className="h-4 w-4" /> Joined
                      </>
                    ) : (
                      "Join"
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
