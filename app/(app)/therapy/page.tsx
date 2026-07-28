import Link from "next/link";
import { HeartPulse, Clock } from "lucide-react";
import { requireUser, getAuthContext } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { INJURY_AREAS } from "@/lib/injury";
import {
  THERAPY_ROUTINES,
  routinesForAreas,
  type TherapyRoutine,
} from "@/lib/therapy";

export const metadata = { title: "Recovery" };

export default async function TherapyPage() {
  await requireUser();
  const { profile } = await getAuthContext();
  const areas = (profile?.injury_areas as string[] | null) ?? [];
  const recommended = routinesForAreas(areas);
  const recommendedAreas = new Set(recommended.map((r) => r.area));
  const others = Object.values(THERAPY_ROUTINES).filter(
    (r) => !recommendedAreas.has(r.area)
  );

  return (
    <PageShell>
      <PageHeader
        title="Recovery"
        subtitle="Gentle mobility and prehab routines for your body."
      />

      {recommended.length > 0 ? (
        <section className="mt-6">
          <h2 className="text-lg font-bold">Recommended for you</h2>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            Based on the areas you flagged as sore or injured.
          </p>
          <div className="mt-4 space-y-4">
            {recommended.map((r) => (
              <RoutineCard key={r.area} routine={r} highlight />
            ))}
          </div>
        </section>
      ) : (
        <div className="mt-6 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
          <p className="text-sm text-[var(--text-secondary)]">
            You haven&apos;t flagged any sore or injured areas. Add them in{" "}
            <Link href="/settings" className="text-[var(--accent-primary)] underline">
              Settings
            </Link>{" "}
            and we&apos;ll tailor recovery routines to you. Meanwhile, browse the
            full library below.
          </p>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold">
          {recommended.length > 0 ? "More routines" : "All routines"}
        </h2>
        <div className="mt-4 space-y-4">
          {others.map((r) => (
            <RoutineCard key={r.area} routine={r} />
          ))}
        </div>
      </section>

      <p className="mt-8 text-xs text-[var(--text-muted)]">
        These routines are general movement guidance, not medical advice. If you
        have pain that&apos;s sharp, worsening or not settling, see a qualified
        health professional.
      </p>
    </PageShell>
  );
}

function areaLabel(value: string) {
  return INJURY_AREAS.find((a) => a.value === value)?.label ?? value;
}

function RoutineCard({
  routine,
  highlight,
}: {
  routine: TherapyRoutine;
  highlight?: boolean;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-card)] border bg-[var(--surface-primary)] ${
        highlight
          ? "border-[var(--border-active)] ring-1 ring-[var(--accent-primary)]/20"
          : "border-[var(--border-subtle)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 p-5 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)]">
              <HeartPulse className="h-4 w-4" />
            </span>
            <p className="font-semibold">{routine.title}</p>
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{routine.focus}</p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--surface-secondary)] px-2.5 py-1 text-xs text-[var(--text-secondary)]">
          <Clock className="h-3.5 w-3.5" /> {routine.minutes} min
        </span>
      </div>
      <span className="mx-5 mb-2 inline-block rounded-full bg-[var(--surface-secondary)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
        {areaLabel(routine.area)}
      </span>
      <ol className="divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
        {routine.moves.map((m, i) => (
          <li key={i} className="flex gap-3 p-4">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--surface-secondary)] text-xs font-bold text-[var(--text-secondary)]">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium">{m.name}</p>
                <span className="shrink-0 text-xs font-semibold text-[var(--accent-primary)]">
                  {m.dose}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{m.how}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
