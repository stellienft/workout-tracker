"use client";

import { useState, useTransition } from "react";
import {
  Pill,
  RefreshCw,
  AlertCircle,
  Dumbbell,
  Heart,
  Zap,
  Sun,
  FlaskConical,
  Clock,
  Utensils,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { getSupplementAdvice } from "@/lib/actions/ai-coach";

type Category = "Protein" | "Performance" | "Recovery" | "Vitamins";

interface Supplement {
  name: string;
  category: Category;
  purpose: string;
  relevance: string;
  dosing: string;
  timing: string;
  foodSources: string;
}

const CATEGORY_STYLES: Record<
  Category,
  { icon: typeof Dumbbell; color: string; bg: string; ring: string }
> = {
  Protein: {
    icon: Dumbbell,
    color: "text-[var(--accent-primary)]",
    bg: "bg-[var(--accent-muted)]",
    ring: "ring-[var(--accent-primary)]/30",
  },
  Performance: {
    icon: Zap,
    color: "text-[#f59e0b]",
    bg: "bg-[#f59e0b]/15",
    ring: "ring-[#f59e0b]/30",
  },
  Recovery: {
    icon: Heart,
    color: "text-[#ef4444]",
    bg: "bg-[#ef4444]/15",
    ring: "ring-[#ef4444]/30",
  },
  Vitamins: {
    icon: Sun,
    color: "text-[#3b82f6]",
    bg: "bg-[#3b82f6]/15",
    ring: "ring-[#3b82f6]/30",
  },
};

const CATEGORY_CHIPS: { label: Category; desc: string }[] = [
  { label: "Protein", desc: "Whey, casein, plant-based" },
  { label: "Performance", desc: "Creatine, beta-alanine" },
  { label: "Recovery", desc: "Magnesium, zinc, omega-3" },
  { label: "Vitamins", desc: "Vitamin D, B12, C" },
];

export function SupplementAdvisor() {
  const [pending, startTransition] = useTransition();
  const [supplements, setSupplements] = useState<Supplement[] | null>(null);
  const toast = useToast();

  function generate() {
    startTransition(async () => {
      const res = await getSupplementAdvice();
      if (res.ok) {
        setSupplements(res.supplements as Supplement[]);
      } else {
        toast(res.error ?? "Could not generate advice", "error");
      }
    });
  }

  // Group by category for the grid
  const grouped = supplements?.reduce(
    (acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    },
    {} as Record<Category, Supplement[]>
  );

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
          <FlaskConical className="h-4 w-4 text-[var(--accent-primary)]" />
        </div>
        <div>
          <p className="font-semibold leading-tight">AI Supplement Advisor</p>
          <p className="text-[10px] text-[var(--text-muted)]">Educational recommendations based on your training</p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-[var(--warning)]/10 px-5 py-2.5 text-[11px] text-[var(--warning)]">
        <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
        <span>Educational only — not medical advice. Consult your doctor before starting any supplement.</span>
      </div>

      <div className="p-5">
        {!supplements && !pending && (
          <>
            {/* Category chips */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORY_CHIPS.map((c) => {
                const style = CATEGORY_STYLES[c.label];
                const Icon = style.icon;
                return (
                  <div
                    key={c.label}
                    className="rounded-xl border border-[var(--border-subtle)] p-3"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-4 w-4 ${style.color}`} />
                      <span className="text-xs font-semibold">{c.label}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{c.desc}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5">
              <p className="text-sm text-[var(--text-secondary)]">
                Get personalised supplement recommendations based on your training profile —
                your goals, training frequency, muscle groups, and experience level.
              </p>
              <Button
                onClick={generate}
                size="lg"
                className="mt-4 gap-2"
              >
                <Pill className="h-4 w-4" />
                Get my recommendations
              </Button>
            </div>
          </>
        )}

        {pending && !supplements && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-primary)] border-t-transparent" />
            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Analysing your training history...
            </p>
          </div>
        )}

        {supplements && grouped && (
          <div className="space-y-5">
            {/* Summary bar */}
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(grouped).map(([cat, items]) => {
                  const style = CATEGORY_STYLES[cat as Category];
                  const Icon = style.icon;
                  return (
                    <span
                      key={cat}
                      className={`inline-flex items-center gap-1 rounded-full ${style.bg} px-2.5 py-1 text-[11px] font-medium ${style.color}`}
                    >
                      <Icon className="h-3 w-3" />
                      {cat} ({items.length})
                    </span>
                  );
                })}
              </div>
              <Button
                onClick={generate}
                disabled={pending}
                variant="secondary"
                size="sm"
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
                {pending ? "..." : "Regenerate"}
              </Button>
            </div>

            {/* Supplement cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              {supplements.map((s, i) => {
                const style = CATEGORY_STYLES[s.category];
                const Icon = style.icon;
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] p-4 ring-1 ${style.ring}`}
                  >
                    {/* Card header */}
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.bg}`}>
                        <Icon className={`h-5 w-5 ${style.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold leading-tight">{s.name}</p>
                        <span className={`text-[10px] font-medium uppercase tracking-wide ${style.color}`}>
                          {s.category}
                        </span>
                      </div>
                    </div>

                    {/* Purpose */}
                    <div className="mt-3">
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {s.purpose}
                      </p>
                    </div>

                    {/* Relevance */}
                    <div className="mt-2.5 flex items-start gap-1.5">
                      <Target className="mt-0.5 h-3 w-3 shrink-0 text-[var(--accent-primary)]" />
                      <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                        {s.relevance}
                      </p>
                    </div>

                    {/* Dosing + Timing */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-[var(--surface-primary)] p-2">
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          Dosing
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--text-primary)]">{s.dosing}</p>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-primary)] p-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5 text-[var(--text-muted)]" />
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                            Timing
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--text-primary)]">{s.timing}</p>
                      </div>
                    </div>

                    {/* Food sources */}
                    <div className="mt-2.5 flex items-start gap-1.5">
                      <Utensils className="mt-0.5 h-3 w-3 shrink-0 text-[var(--text-muted)]" />
                      <div>
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                          Food sources:{" "}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">{s.foodSources}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
