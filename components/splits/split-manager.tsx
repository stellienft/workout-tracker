"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Layers, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { createSplit, deleteSplit } from "@/lib/actions/splits";

interface SplitRow {
  id: string;
  name: string;
  description: string | null;
  dayCount: number;
}

export function SplitManager({ splits }: { splits: SplitRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function create() {
    startTransition(async () => {
      const res = await createSplit({ name, description });
      if (res.ok) {
        toast("Split created.", "success");
        router.push(`/splits/${res.id}`);
      } else {
        toast(res.error ?? "Could not create", "error");
      }
    });
  }

  function remove(id: string, splitName: string) {
    if (!confirm(`Delete "${splitName}" and all its days?`)) return;
    startTransition(async () => {
      const res = await deleteSplit(id);
      if (res.ok) {
        toast("Split deleted.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not delete", "error");
      }
    });
  }

  return (
    <div className="space-y-4">
      {creating ? (
        <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Split name (e.g. Push / Pull / Legs)"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <div className="flex gap-2">
            <Button
              onClick={create}
              disabled={pending || name.trim().length < 2}
              size="lg"
              className="flex-1"
            >
              {pending ? "Creating…" : "Create split"}
            </Button>
            <Button
              onClick={() => setCreating(false)}
              variant="secondary"
              size="lg"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-card)] bg-[var(--accent-primary)] py-4 text-sm font-semibold text-black"
        >
          <Plus className="h-4 w-4" /> New split
        </button>
      )}

      {splits.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] py-12 text-center text-sm text-[var(--text-muted)]">
          <Layers className="mb-1 h-6 w-6" />
          <p>No splits yet.</p>
          <p>Create one, then add days like &quot;Chest &amp; Triceps&quot;.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {splits.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
            >
              <Link href={`/splits/${s.id}`} className="min-w-0 flex-1">
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {s.dayCount} {s.dayCount === 1 ? "day" : "days"}
                  {s.description ? ` · ${s.description}` : ""}
                </p>
              </Link>
              <button
                onClick={() => remove(s.id, s.name)}
                disabled={pending}
                aria-label="Delete split"
                className="text-[var(--text-muted)] hover:text-[var(--danger)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <Link
                href={`/splits/${s.id}`}
                className="text-[var(--text-muted)]"
                aria-label="Open split"
              >
                <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
