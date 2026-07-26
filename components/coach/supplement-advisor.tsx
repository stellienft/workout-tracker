"use client";

import { useState, useTransition } from "react";
import { Pill, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getSupplementAdvice } from "@/lib/actions/ai-coach";

const CATEGORIES = [
  { label: "Protein", desc: "Whey, casein, plant-based" },
  { label: "Performance", desc: "Creatine, beta-alanine, citrulline" },
  { label: "Recovery", desc: "Magnesium, zinc, omega-3" },
  { label: "Vitamins", desc: "Vitamin D, B12, C, multivitamins" },
];

export function SupplementAdvisor() {
  const [pending, startTransition] = useTransition();
  const [advice, setAdvice] = useState<string | null>(null);
  const toast = useToast();

  function generate() {
    startTransition(async () => {
      const res = await getSupplementAdvice();
      if (res.ok) {
        setAdvice(res.advice);
      } else {
        toast(res.error ?? "Could not generate advice", "error");
      }
    });
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
        <Pill className="h-5 w-5 text-[var(--accent-primary)]" />
        <p className="font-semibold">AI Supplement Advisor</p>
        <span className="ml-auto text-xs text-[var(--text-muted)]">Educational only</span>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-[var(--warning)]/10 px-5 py-3 text-xs text-[var(--warning)]">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Educational information only — not medical advice. Always consult your doctor before starting any supplement.
        </span>
      </div>

      <div className="p-5">
        {/* Category chips */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <span
              key={c.label}
              className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs"
            >
              <span className="font-medium text-[var(--text-primary)]">{c.label}</span>
              <span className="ml-1.5 text-[var(--text-muted)]">{c.desc}</span>
            </span>
          ))}
        </div>

        {/* Generate button or advice */}
        {!advice && (
          <div className="mt-5">
            <p className="text-sm text-[var(--text-secondary)]">
              Get personalised supplement recommendations based on your training profile —
              your goals, training frequency, muscle groups, and experience level.
            </p>
            <Button
              onClick={generate}
              disabled={pending}
              size="lg"
              className="mt-4 gap-2"
            >
              <Pill className="h-4 w-4" />
              {pending ? "Analysing your training…" : "Get my recommendations"}
            </Button>
          </div>
        )}

        {pending && !advice && (
          <div className="mt-4 flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
            Reading your training history and building recommendations...
          </div>
        )}

        {advice && (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl bg-[var(--surface-secondary)] p-4 text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
              {advice}
            </div>
            <Button
              onClick={generate}
              disabled={pending}
              variant="secondary"
              size="sm"
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {pending ? "Regenerating…" : "Regenerate"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
