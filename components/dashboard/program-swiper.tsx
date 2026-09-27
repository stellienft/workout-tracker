"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { CoverImage } from "@/components/ui/cover-image";
import { switchActiveProgram } from "@/lib/actions/enrolment";
import type { InProgressProgram } from "@/lib/queries";

/**
 * Swipeable "today" hero. The active program's card (passed as children) is the
 * first slide; each other program the member holds is a slide they can swipe to
 * and switch into. Uses native horizontal scroll-snap so the swipe feels right
 * on mobile without custom gesture handling.
 */
export function ProgramSwiper({
  others,
  children,
}: {
  others: InProgressProgram[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [idx, setIdx] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // No second program → nothing to swipe; render the hero as-is.
  if (others.length === 0) return <>{children}</>;

  const slides = others.length + 1;

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    const kids = Array.from(el.querySelectorAll<HTMLElement>("[data-slide]"));
    let best = 0;
    let bestDist = Infinity;
    kids.forEach((k, i) => {
      const dist = Math.abs(k.offsetLeft + k.offsetWidth / 2 - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    });
    setIdx(best);
  };

  const switchTo = (enrolmentId: string) =>
    start(async () => {
      await switchActiveProgram(enrolmentId);
      router.refresh();
    });

  return (
    <div>
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-[5%]"
      >
        <div data-slide className="w-[90%] shrink-0 snap-center">
          {children}
        </div>

        {others.map((p) => (
          <div key={p.enrolmentId} data-slide className="w-[90%] shrink-0 snap-center">
            <div className="relative min-h-[18rem] overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] sm:min-h-[20rem]">
              <CoverImage
                path={p.coverPath}
                alt={p.name}
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
              <div className="halftone pointer-events-none absolute inset-0" />
              <div className="on-media relative flex min-h-[18rem] flex-col justify-between gap-4 p-5 sm:min-h-[20rem] sm:p-6">
                <span className="w-fit rounded-full bg-black/50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] backdrop-blur">
                  {p.status === "pending" ? "Not started" : "Paused"} · Week {p.week}
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                    Your other program
                  </p>
                  <h2 className="text-3xl font-extrabold leading-tight">{p.name}</h2>
                  <button
                    onClick={() => switchTo(p.enrolmentId)}
                    disabled={pending}
                    className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-[var(--accent-ink)] transition-opacity disabled:opacity-60"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                    {pending ? "Switching…" : "Switch to this program"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Slide indicator */}
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {Array.from({ length: slides }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={`h-1.5 rounded-full transition-all ${
              i === idx ? "w-4 bg-[var(--accent-primary)]" : "w-1.5 bg-[var(--border-active)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
