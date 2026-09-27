"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const QA: { q: string; a: string }[] = [
  {
    q: "Is Ares Fitness only on iPhone?",
    a: "Yes — Ares is built exclusively for iOS. We design every screen for iPhone (and Apple Watch), tapping into native performance, notifications and health data rather than shipping a watered-down cross-platform build.",
  },
  {
    q: "Do I need any equipment?",
    a: "No. Programs range from full-gym splits to minimal-equipment and bodyweight plans, and the AI coach can swap any exercise for what you actually have on hand.",
  },
  {
    q: "Is it good for beginners?",
    a: "Absolutely. Start with the Beginner Muscle Builder, follow guided sessions with rest timers and form videos, and let progress tracking show you the wins as they add up.",
  },
  {
    q: "What do I get with Pro?",
    a: "Pro unlocks AI coaching, full nutrition and meal plans, body-composition tracking, custom splits, supplements and health insights. The core training log, programs and progress are free forever.",
  },
  {
    q: "Can personal trainers use it with clients?",
    a: "Yes. Trainers get a portal to program for clients, track their progress, message them and sell coaching packages — all from the same app.",
  },
  {
    q: "How does billing work across web and app?",
    a: "One membership. Whether you subscribe on the web or through the App Store, your Pro access is unified behind a single account, so you're never charged twice.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-2xl divide-y divide-white/8 overflow-hidden rounded-card border border-border-subtle bg-surface/50">
      {QA.map((item, i) => {
        const on = open === i;
        return (
          <div key={item.q}>
            <button
              onClick={() => setOpen(on ? null : i)}
              aria-expanded={on}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
            >
              <span className="font-display text-[15px] font-bold text-white sm:text-base">
                {item.q}
              </span>
              <Plus
                className={`h-5 w-5 shrink-0 text-accent transition-transform duration-300 ${
                  on ? "rotate-45" : ""
                }`}
              />
            </button>
            <div
              className="grid transition-all duration-300"
              style={{ gridTemplateRows: on ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-text-2 sm:px-6">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
