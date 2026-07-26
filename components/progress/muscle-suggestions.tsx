"use client";

import { useState, useTransition } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getMuscleSuggestions } from "@/lib/actions/ai-coach";

interface MuscleSuggestionsProps {
  /** Undertrained muscle group names; empty = nothing to suggest yet. */
  undertrainedMuscles: string[];
}

export function MuscleSuggestions({ undertrainedMuscles }: MuscleSuggestionsProps) {
  const [pending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const toast = useToast();

  const hasMuscles = undertrainedMuscles.length > 0;

  function getSuggestions() {
    if (!hasMuscles) {
      toast("Log more workouts to get AI suggestions.", "info");
      return;
    }
    startTransition(async () => {
      const res = await getMuscleSuggestions(undertrainedMuscles);
      if (res.ok) {
        setSuggestions(res.suggestions);
      } else {
        toast(res.error ?? "Could not generate suggestions", "error");
      }
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
          <Sparkles className="h-4 w-4 text-[var(--accent-primary)]" />
        </div>
        <div>
          <p className="font-semibold leading-tight">AI Coach</p>
          <p className="text-[10px] text-[var(--text-muted)]">
            Exercise ideas for undertrained muscles
          </p>
        </div>
      </div>

      <div className="mt-4">
        {!suggestions && !pending && (
          <>
            <p className="text-sm text-[var(--text-secondary)]">
              {hasMuscles ? (
                <>
                  Your least-trained muscle groups:{" "}
                  <span className="font-medium text-[var(--text-primary)]">
                    {undertrainedMuscles.join(", ")}
                  </span>
                  . Get AI-suggested exercises to bring them up.
                </>
              ) : (
                <>No undertrained muscle groups detected — keep logging workouts!</>
              )}
            </p>
            <Button
              onClick={getSuggestions}
              size="lg"
              className="mt-4 gap-2"
              disabled={!hasMuscles}
            >
              <Sparkles className="h-4 w-4" />
              Get exercise suggestions
            </Button>
          </>
        )}

        {pending && !suggestions && (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Asking the AI Coach...
            </p>
          </div>
        )}

        {suggestions && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                AI Suggestions
              </p>
              <Button
                onClick={getSuggestions}
                disabled={pending}
                variant="secondary"
                size="sm"
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
                {pending ? "..." : "Regenerate"}
              </Button>
            </div>
            <div className="whitespace-pre-line rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-primary)] leading-relaxed">
              {suggestions}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
