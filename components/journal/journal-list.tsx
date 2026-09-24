"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { deleteJournalEntry } from "@/lib/actions/journal";

export interface JournalItem {
  id: string;
  when: string; // formatted date + time
  body: string;
  audioUrl: string | null;
}

export function JournalList({ entries }: { entries: JournalItem[] }) {
  const toast = useToast();
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function remove(id: string) {
    if (!confirm("Delete this journal entry?")) return;
    setDeleting(id);
    startTransition(async () => {
      const res = await deleteJournalEntry(id);
      if (res.ok) {
        toast("Entry deleted.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't delete — try again.", "error");
        setDeleting(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      {entries.map((e) => (
        <article
          key={e.id}
          className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
              {e.when}
            </p>
            <button
              onClick={() => remove(e.id)}
              disabled={deleting === e.id}
              aria-label="Delete entry"
              className="shrink-0 text-[var(--text-muted)] hover:text-[var(--danger,#e5484d)] disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {e.body && (
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
              {e.body}
            </p>
          )}
          {e.audioUrl && (
            <audio src={e.audioUrl} controls preload="none" className="mt-3 h-10 w-full" />
          )}
        </article>
      ))}
    </div>
  );
}
