import type { ReactNode } from "react";
import {
  Check,
  Flame,
  Dumbbell,
  Timer,
  Sparkles,
  Mic,
  Trophy,
  ChevronRight,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Phone frame + in-app UI mockups, built entirely from markup so the
 * marketing site has zero image dependencies for its screenshots. The
 * screens are stylised representations of real Ares Fitness features.
 * ------------------------------------------------------------------ */

export function Phone({
  children,
  className = "",
  glow = true,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div className={`relative ${className}`}>
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[60px] opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 20%, rgba(255,82,14,.45), transparent 70%)",
          }}
        />
      )}
      <div
        className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-[44px] border border-white/12 bg-[#0a0a0a] p-2.5 shadow-2xl"
        style={{ aspectRatio: "9 / 19.2", boxShadow: "0 40px 90px -30px rgba(0,0,0,.9)" }}
      >
        {/* Dynamic-island pill */}
        <div className="absolute left-1/2 top-3 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div className="relative h-full w-full overflow-hidden rounded-[34px] bg-bg">
          {/* status bar */}
          <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-semibold text-white/80">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-4 rounded-[3px] border border-white/50" />
            </span>
          </div>
          <div className="h-[calc(100%-1.75rem)] overflow-hidden px-4 pt-3">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Header({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <h4 className="font-display text-lg font-extrabold leading-none text-white">{title}</h4>
      {sub && <p className="mt-1 text-[11px] text-text-2">{sub}</p>}
    </div>
  );
}

/* ---- 1. Live workout session ---- */
export function ScreenWorkout() {
  const sets = [
    { w: "80 kg", r: 8, done: true },
    { w: "82.5 kg", r: 8, done: true },
    { w: "85 kg", r: 6, done: false },
  ];
  return (
    <div>
      <Header title="Bench Press" sub="Push Day · Set 3 of 4" />
      <div className="mb-3 flex items-center gap-2 rounded-2xl bg-accent-muted px-3 py-2">
        <Flame className="h-4 w-4 text-accent" />
        <span className="text-[11px] font-semibold text-white">Warm-up included · +12 min</span>
      </div>
      <div className="space-y-2">
        {sets.map((s, i) => (
          <div
            key={i}
            className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 ${
              s.done ? "border-accent/40 bg-accent-muted" : "border-border-subtle bg-surface"
            }`}
          >
            <span className="text-[11px] font-semibold text-text-2">Set {i + 1}</span>
            <span className="text-sm font-bold text-white">{s.w}</span>
            <span className="text-[11px] text-text-2">{s.r} reps</span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${
                s.done ? "bg-accent text-white" : "border border-border-subtle text-text-3"
              }`}
            >
              <Check className="h-3.5 w-3.5" />
            </span>
          </div>
        ))}
      </div>
      {/* rest timer */}
      <div className="mt-3 flex flex-col items-center rounded-3xl border border-border-subtle bg-surface py-3">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="#ff520e"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray="264"
              strokeDashoffset="92"
            />
          </svg>
          <div className="text-center">
            <div className="font-display text-lg font-extrabold text-white">1:05</div>
          </div>
        </div>
        <span className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-accent">
          <Timer className="h-3.5 w-3.5" /> Rest timer
        </span>
      </div>
    </div>
  );
}

/* ---- 2. Programs ---- */
export function ScreenPrograms() {
  const progs = [
    { name: "Minimum Effective Dose", tag: "3× / week", weeks: "8 wks" },
    { name: "Mass Blueprint", tag: "Hypertrophy", weeks: "12 wks" },
    { name: "Beginner Muscle Builder", tag: "Full body", weeks: "6 wks" },
    { name: "Shred & Define", tag: "Cutting", weeks: "10 wks" },
  ];
  return (
    <div>
      <Header title="Programs" sub="Structured plans that adapt to you" />
      <div className="space-y-2.5">
        {progs.map((p) => (
          <div
            key={p.name}
            className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted">
              <Dumbbell className="h-5 w-5 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-bold text-white">{p.name}</div>
              <div className="text-[10px] text-text-2">
                {p.tag} · {p.weeks}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-text-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- 3. Progress ---- */
export function ScreenProgress() {
  // A simple upward e1RM line
  const pts = [6, 18, 14, 30, 26, 44, 52, 70];
  const w = 240;
  const h = 92;
  const step = w / (pts.length - 1);
  const max = 80;
  const path = pts
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (v / max) * h}`)
    .join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <div>
      <Header title="Progress" sub="Estimated 1RM · Bench Press" />
      <div className="rounded-3xl border border-border-subtle bg-surface p-3">
        <div className="mb-1 flex items-end justify-between">
          <span className="font-display text-2xl font-extrabold text-white">
            88<span className="text-sm text-text-2"> kg</span>
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: "rgba(34,197,94,.16)", color: "#22c55e" }}
          >
            +14% ▲
          </span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
          <defs>
            <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff520e" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#ff520e" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#ar)" />
          <path d={path} fill="none" stroke="#ff520e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { k: "Volume", v: "12.4t" },
          { k: "Streak", v: "18 days" },
          { k: "PRs", v: "7" },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl border border-border-subtle bg-surface p-2.5 text-center">
            <div className="font-display text-sm font-extrabold text-white">{s.v}</div>
            <div className="text-[9px] text-text-2">{s.k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- 4. Achievement share card ---- */
export function ScreenAchievement() {
  return (
    <div>
      <Header title="Achievements" sub="Share your milestones" />
      <div className="relative overflow-hidden rounded-3xl border border-accent/30 bg-gradient-to-b from-[#1a0f08] to-bg p-4 text-center">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(#ff520e 1px, transparent 1.6px)",
            backgroundSize: "12px 12px",
          }}
        />
        <div className="relative">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
            Milestone Reached
          </span>
          <p className="mx-auto mt-2 max-w-[180px] text-[10px] italic leading-snug text-text-2">
            &ldquo;The iron does not lie. You have earned this ground — now hold it.&rdquo;
          </p>
          <div className="mx-auto mt-3 flex h-24 w-24 items-center justify-center rounded-full border-2 border-accent bg-accent-muted">
            <Trophy className="h-10 w-10 text-accent" />
          </div>
          <div className="mt-3 font-display text-xl font-extrabold text-white">25 Workouts</div>
          <div className="text-[11px] font-semibold text-text-2">Consistency</div>
        </div>
      </div>
    </div>
  );
}

/* ---- 5. Meal plans ---- */
export function ScreenMeals() {
  const meals = [
    { m: "Breakfast", n: "Spartan Steak & Eggs", kc: 540, c: "#c2410c" },
    { m: "Lunch", n: "Chicken & Rice Bowl", kc: 620, c: "#a16207" },
    { m: "Dinner", n: "Salmon, Greens & Quinoa", kc: 580, c: "#15803d" },
  ];
  return (
    <div>
      <Header title="Meal Plans" sub="7-day rotation · Wed" />
      <div className="mb-3 flex items-center justify-between rounded-2xl border border-border-subtle bg-surface px-3 py-2">
        <span className="text-[11px] font-bold text-white">1,940 kcal</span>
        <span className="text-[10px] text-text-2">P 168 · C 152 · F 62</span>
      </div>
      <div className="space-y-2.5">
        {meals.map((m) => (
          <div key={m.m} className="flex items-center gap-3 rounded-2xl border border-border-subtle bg-surface p-2.5">
            <div
              className="h-11 w-11 shrink-0 rounded-xl"
              style={{ background: `linear-gradient(135deg, ${m.c}, #1a1a1a)` }}
            />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-semibold uppercase tracking-wide text-accent">{m.m}</div>
              <div className="truncate text-[12px] font-bold text-white">{m.n}</div>
            </div>
            <span className="shrink-0 text-[11px] font-semibold text-text-2">{m.kc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- 6. AI Coach chat ---- */
export function ScreenCoach() {
  return (
    <div>
      <Header title="AI Coach" sub="Always in your corner" />
      <div className="space-y-2.5">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-accent px-3 py-2 text-[11px] font-medium text-white">
          My shoulder feels tight — swap today&rsquo;s overhead press?
        </div>
        <div className="mr-auto max-w-[88%] rounded-2xl rounded-tl-md border border-border-subtle bg-surface px-3 py-2 text-[11px] text-white">
          <span className="mb-1 flex items-center gap-1 text-[10px] font-bold text-accent">
            <Sparkles className="h-3 w-3" /> Coach
          </span>
          Done. I&rsquo;ve subbed in a landmine press and added band pull-aparts to warm the joint. Volume&rsquo;s matched.
        </div>
        <div className="mr-auto flex items-center gap-2 rounded-2xl border border-border-subtle bg-surface px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-muted">
            <Dumbbell className="h-3.5 w-3.5 text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-bold text-white">Landmine Press</div>
            <div className="text-[9px] text-text-2">3 × 10 · added to session</div>
          </div>
          <Check className="h-4 w-4 text-[color:var(--success)]" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-2">
        <Mic className="h-3.5 w-3.5 text-text-3" />
        <span className="text-[10px] text-text-3">Ask your coach anything…</span>
      </div>
    </div>
  );
}
