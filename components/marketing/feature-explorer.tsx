"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  Dumbbell,
  BookOpen,
  TrendingUp,
  Trophy,
  UtensilsCrossed,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  Phone,
  ScreenWorkout,
  ScreenPrograms,
  ScreenProgress,
  ScreenAchievement,
  ScreenMeals,
  ScreenCoach,
  type Tab,
} from "./screens";

interface Feature {
  id: string;
  icon: LucideIcon;
  title: string;
  blurb: string;
  points: string[];
  screen: ComponentType;
  tab: Tab;
}

const FEATURES: Feature[] = [
  {
    id: "train",
    icon: Dumbbell,
    title: "Log every set as you train",
    blurb:
      "A distraction-free workout mode with weight × reps logging, auto rest timers and warm-ups counted into your total time.",
    points: ["Guided rest timers", "Warm-up time included", "One-tap set completion"],
    screen: ScreenWorkout,
    tab: "workouts",
  },
  {
    id: "programs",
    icon: BookOpen,
    title: "Follow programs that adapt",
    blurb:
      "Structured, science-backed plans — from a minimum-effective-dose split to full hypertrophy and cutting blocks — that scale with your progress.",
    points: ["Beginner to advanced", "Hypertrophy, strength & shred", "Self-paced scheduling"],
    screen: ScreenPrograms,
    tab: "workouts",
  },
  {
    id: "progress",
    icon: TrendingUp,
    title: "Watch your strength climb",
    blurb:
      "Estimated 1RM, volume, streaks and body composition charted over time so every session shows up as a line moving up and to the right.",
    points: ["Estimated 1RM trends", "Volume & streaks", "Body-composition tracking"],
    screen: ScreenProgress,
    tab: "progress",
  },
  {
    id: "achievements",
    icon: Trophy,
    title: "Earn milestones worth sharing",
    blurb:
      "Hit a milestone and Ares mints a share card with a god-voice line to match — built to look good on your story.",
    points: ["Auto-generated share cards", "Mythic god-voice quotes", "PRs, streaks & volume"],
    screen: ScreenAchievement,
    tab: "progress",
  },
  {
    id: "nutrition",
    icon: UtensilsCrossed,
    title: "Eat for the physique you want",
    blurb:
      "Weekly meal plans on a 7-day rotation, built from real recipes with macros that match your goal — bulk, maintain or cut.",
    points: ["7-day meal rotation", "Real recipes & photos", "Macros matched to your goal"],
    screen: ScreenMeals,
    tab: "home",
  },
  {
    id: "coach",
    icon: Sparkles,
    title: "Train with an AI coach",
    blurb:
      "Ask for swaps, form cues or a plan for the day. Your coach adjusts around injuries and equipment and writes it straight into your session.",
    points: ["Instant exercise swaps", "Injury-aware adjustments", "Answers, anytime"],
    screen: ScreenCoach,
    tab: "home",
  },
];

const AUTOPLAY_MS = 5200;

export function FeatureExplorer() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || paused) return;
    timer.current = setInterval(() => {
      setActive((a) => (a + 1) % FEATURES.length);
    }, AUTOPLAY_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [paused]);

  // Pause autoplay while the tab is hidden so it doesn't race in the background.
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function select(i: number) {
    setActive(i);
    setPaused(true);
  }

  const ActiveScreen = FEATURES[active].screen;

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      {/* Phone preview */}
      <div className="order-1 flex justify-center lg:sticky lg:top-24">
        <Phone tab={FEATURES[active].tab}>
          <div key={active} className="ares-screen-in h-full">
            <ActiveScreen />
          </div>
        </Phone>
      </div>

      {/* Feature list */}
      <div className="order-2">
        <ul className="flex flex-col gap-2.5">
          {FEATURES.map((f, i) => {
            const on = i === active;
            const Icon = f.icon;
            return (
              <li key={f.id}>
                <button
                  onClick={() => select(i)}
                  aria-current={on}
                  className={`group w-full rounded-3xl border p-4 text-left transition-all duration-300 ${
                    on
                      ? "border-accent/50 bg-surface"
                      : "border-border-subtle bg-surface/40 hover:border-white/15 hover:bg-surface/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        on ? "bg-accent text-white" : "bg-accent-muted text-accent"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3
                      className={`text-base font-medium sm:text-lg ${
                        on ? "text-white" : "text-text-2 group-hover:text-white"
                      }`}
                    >
                      {f.title}
                    </h3>
                  </div>
                  {/* Expanding detail on the active item */}
                  <div
                    className="grid transition-all duration-300"
                    style={{
                      gridTemplateRows: on ? "1fr" : "0fr",
                      opacity: on ? 1 : 0,
                    }}
                  >
                    <div className="overflow-hidden">
                      <p className="pt-3 text-sm leading-relaxed text-text-2">{f.blurb}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {f.points.map((p) => (
                          <span
                            key={p}
                            className="rounded-full border border-border-subtle bg-bg px-2.5 py-1 text-[11px] font-medium text-text-2"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
        {/* progress dots */}
        <div className="mt-5 flex items-center gap-1.5 pl-1">
          {FEATURES.map((f, i) => (
            <button
              key={f.id}
              aria-label={`Show ${f.title}`}
              onClick={() => select(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? "w-7 bg-accent" : "w-1.5 bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
