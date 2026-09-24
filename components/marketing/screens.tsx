import type { ReactNode } from "react";
import {
  Check,
  Flame,
  Dumbbell,
  Sparkles,
  Mic,
  Trophy,
  Share2,
  ChevronLeft,
  Plus,
  Play,
  Home,
  TrendingUp,
  Users,
  User,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 * Phone frame + in-app UI, built to mirror the real Ares app: the same
 * dark surfaces, 24px card radius, Sora display numerals, orange accent
 * and a live bottom tab bar. Zero image dependencies.
 * ------------------------------------------------------------------ */

export type Tab = "home" | "workouts" | "progress" | "feed" | "profile";

const TABS: { id: Tab; icon: LucideIcon }[] = [
  { id: "home", icon: Home },
  { id: "workouts", icon: Dumbbell },
  { id: "progress", icon: TrendingUp },
  { id: "feed", icon: Users },
  { id: "profile", icon: User },
];

export function Phone({
  children,
  tab,
  className = "",
  glow = true,
  nav = true,
}: {
  children: ReactNode;
  tab?: Tab;
  className?: string;
  glow?: boolean;
  nav?: boolean;
}) {
  return (
    <div className={`relative ${className}`}>
      {glow && (
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-6 -z-10 rounded-[60px] opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 20%, rgba(255,82,14,.4), transparent 70%)",
          }}
        />
      )}
      <div
        className="relative mx-auto w-full max-w-[300px] overflow-hidden rounded-[46px] border border-white/12 bg-[#0a0a0a] p-2.5 shadow-2xl"
        style={{ aspectRatio: "9 / 19.3", boxShadow: "0 40px 90px -30px rgba(0,0,0,.9)" }}
      >
        <div className="absolute left-1/2 top-3 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-black" />
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[36px] bg-bg">
          {/* status bar */}
          <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold text-white">
            <span>9:41</span>
            <span className="flex items-center gap-1.5">
              <span className="flex items-end gap-[2px]">
                <span className="h-1.5 w-[3px] rounded-sm bg-white/80" />
                <span className="h-2 w-[3px] rounded-sm bg-white/80" />
                <span className="h-2.5 w-[3px] rounded-sm bg-white/80" />
                <span className="h-3 w-[3px] rounded-sm bg-white/40" />
              </span>
              <span className="ml-0.5 inline-block h-2.5 w-4 rounded-[3px] border border-white/50" />
            </span>
          </div>
          <div className="flex-1 overflow-hidden px-4 pt-3">{children}</div>
          {nav && <BottomNav active={tab} />}
        </div>
      </div>
    </div>
  );
}

function BottomNav({ active }: { active?: Tab }) {
  return (
    <div className="flex items-center justify-around border-t border-white/8 bg-[#111]/90 px-2 pb-3 pt-2 backdrop-blur">
      {TABS.map((t) => {
        const on = t.id === active;
        const Icon = t.icon;
        return (
          <div key={t.id} className="flex flex-col items-center gap-1">
            <Icon className={`h-[18px] w-[18px] ${on ? "text-accent" : "text-text-3"}`} strokeWidth={2.25} />
            <span className={`h-1 w-1 rounded-full ${on ? "bg-accent" : "bg-transparent"}`} />
          </div>
        );
      })}
    </div>
  );
}

/* Shared header used across screens */
function ScreenHead({
  title,
  sub,
  back = false,
  right,
}: {
  title: string;
  sub?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {back && (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-text-2">
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h4 className="truncate font-display text-[17px] font-extrabold leading-tight text-white">{title}</h4>
        {sub && <p className="truncate text-[11px] text-text-2">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ---- 1. Live workout session ---- */
export function ScreenWorkout() {
  const sets = [
    { w: "80", r: 8, done: true },
    { w: "82.5", r: 8, done: true },
    { w: "85", r: 6, done: false },
  ];
  return (
    <div>
      <ScreenHead
        title="Push Day"
        sub="Exercise 2 of 5"
        back
        right={
          <span className="rounded-full bg-surface px-2.5 py-1 font-display text-[11px] font-bold text-white">
            42:15
          </span>
        }
      />
      <div className="rounded-card border border-border-subtle bg-surface p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-[14px] font-bold text-white">Barbell Bench Press</span>
          <span className="rounded-full bg-accent-muted px-2 py-0.5 text-[9px] font-semibold text-accent">Chest</span>
        </div>
        <div className="mb-1 grid grid-cols-[28px_1fr_1fr_28px] gap-2 px-1 text-[9px] font-semibold uppercase tracking-wide text-text-3">
          <span>Set</span>
          <span>Kg</span>
          <span>Reps</span>
          <span />
        </div>
        <div className="space-y-1.5">
          {sets.map((s, i) => (
            <div
              key={i}
              className={`grid grid-cols-[28px_1fr_1fr_28px] items-center gap-2 rounded-xl px-1 py-2 ${
                s.done ? "bg-accent-muted" : "bg-surface-2"
              }`}
            >
              <span className="text-center text-[11px] font-semibold text-text-2">{i + 1}</span>
              <span className="font-display text-[13px] font-bold text-white">{s.w}</span>
              <span className="font-display text-[13px] font-bold text-white">{s.r}</span>
              <span
                className={`mx-auto flex h-5 w-5 items-center justify-center rounded-full ${
                  s.done ? "bg-accent text-white" : "border border-white/15 text-text-3"
                }`}
              >
                <Check className="h-3 w-3" />
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-card border border-border-subtle bg-surface p-3">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="8" />
            <circle cx="50" cy="50" r="44" fill="none" stroke="#ff520e" strokeWidth="8" strokeLinecap="round" strokeDasharray="276" strokeDashoffset="96" />
          </svg>
          <span className="font-display text-[13px] font-extrabold text-white">1:05</span>
        </div>
        <div className="flex-1">
          <div className="text-[12px] font-bold text-white">Rest timer</div>
          <div className="text-[10px] text-text-2">Next: Set 3 · 85 kg</div>
        </div>
        <span className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-white">+15s</span>
      </div>
    </div>
  );
}

/* ---- 2. Programs ---- */
export function ScreenPrograms() {
  return (
    <div>
      <ScreenHead title="Programs" sub="Your plan for this block" />
      <div className="overflow-hidden rounded-card border border-border-subtle bg-surface">
        <div className="relative h-20" style={{ background: "linear-gradient(135deg,#ff520e,#7a1f05)" }}>
          <div aria-hidden className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1.4px)", backgroundSize: "10px 10px" }} />
          <span className="absolute bottom-2 left-3 font-display text-[15px] font-extrabold text-white">Mass Blueprint</span>
        </div>
        <div className="p-3">
          <div className="mb-1.5 flex items-center justify-between text-[10px] text-text-2">
            <span>Week 3 of 8</span>
            <span className="font-semibold text-accent">38%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-accent" style={{ width: "38%" }} />
          </div>
        </div>
      </div>
      <div className="mt-2.5 space-y-2">
        {[
          { n: "Minimum Effective Dose", m: "3× / week" },
          { n: "Beginner Muscle Builder", m: "Full body" },
        ].map((p) => (
          <div key={p.n} className="flex items-center gap-3 rounded-card-sm border border-border-subtle bg-surface p-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-muted">
              <Dumbbell className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold text-white">{p.n}</div>
              <div className="text-[10px] text-text-2">{p.m}</div>
            </div>
            <Plus className="h-4 w-4 text-text-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- 3. Progress ---- */
export function ScreenProgress() {
  const pts = [8, 16, 13, 26, 24, 38, 46, 60];
  const w = 236;
  const h = 84;
  const step = w / (pts.length - 1);
  const max = 68;
  const line = pts.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (v / max) * h}`).join(" ");
  return (
    <div>
      <ScreenHead title="Progress" sub="Bench Press · estimated 1RM" />
      <div className="rounded-card border border-border-subtle bg-surface p-3">
        <div className="mb-1 flex items-end justify-between">
          <span className="font-display text-[26px] font-extrabold leading-none text-white">
            88<span className="text-[13px] text-text-2"> kg</span>
          </span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(34,197,94,.16)", color: "#22c55e" }}>
            +14% ▲
          </span>
        </div>
        <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 w-full">
          <defs>
            <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff520e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ff520e" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L ${w} ${h} L 0 ${h} Z`} fill="url(#pg)" />
          <path d={line} fill="none" stroke="#ff520e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={w} cy={h - (pts[pts.length - 1] / max) * h} r="3.5" fill="#fff" stroke="#ff520e" strokeWidth="2" />
        </svg>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {[
          { k: "Volume", v: "12.4t" },
          { k: "Streak", v: "18d" },
          { k: "PRs", v: "7" },
        ].map((s) => (
          <div key={s.k} className="rounded-card-sm border border-border-subtle bg-surface p-2.5 text-center">
            <div className="font-display text-[15px] font-extrabold text-white">{s.v}</div>
            <div className="text-[9px] uppercase tracking-wide text-text-3">{s.k}</div>
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
      <ScreenHead
        title="Achievements"
        right={
          <span className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-white">
            <Share2 className="h-3 w-3" /> Share
          </span>
        }
      />
      <div className="relative overflow-hidden rounded-card border border-accent/30 bg-gradient-to-b from-[#1c0f07] to-bg p-4 text-center">
        <div aria-hidden className="absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(#ff520e 1px, transparent 1.6px)", backgroundSize: "12px 12px" }} />
        <div className="relative">
          <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-accent">Milestone Reached</span>
          <p className="mx-auto mt-2 max-w-[180px] text-[10px] italic leading-snug text-text-2">
            &ldquo;The iron does not lie. You have earned this ground — now hold it.&rdquo;
          </p>
          <div className="mx-auto mt-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent bg-accent-muted">
            <Trophy className="h-9 w-9 text-accent" />
          </div>
          <div className="mt-2.5 font-display text-[20px] font-extrabold text-white">25 Workouts</div>
          <div className="text-[11px] font-semibold text-text-2">Consistency</div>
        </div>
      </div>
    </div>
  );
}

/* ---- 5. Meal plans ---- */
export function ScreenMeals() {
  const macros = [
    { k: "Protein", v: 168, pct: 62, c: "#ff520e" },
    { k: "Carbs", v: 152, pct: 48, c: "#f5b942" },
    { k: "Fat", v: 62, pct: 40, c: "#4d9de0" },
  ];
  const meals = [
    { m: "Breakfast", n: "Spartan Steak & Eggs", kc: 540, c: "#c2410c" },
    { m: "Lunch", n: "Chicken & Rice Bowl", kc: 620, c: "#a16207" },
    { m: "Dinner", n: "Salmon & Quinoa", kc: 580, c: "#15803d" },
  ];
  return (
    <div>
      <ScreenHead title="Meal Plans" sub="Muscle-gain week · Wed" />
      <div className="rounded-card border border-border-subtle bg-surface p-3">
        <div className="mb-2 flex items-end justify-between">
          <span className="font-display text-[18px] font-extrabold text-white">1,940<span className="text-[11px] text-text-2"> kcal</span></span>
          <span className="text-[10px] text-text-2">Goal 2,050</span>
        </div>
        <div className="space-y-1.5">
          {macros.map((m) => (
            <div key={m.k} className="flex items-center gap-2">
              <span className="w-12 text-[9px] font-semibold uppercase tracking-wide text-text-3">{m.k}</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${m.pct}%`, background: m.c }} />
              </div>
              <span className="w-8 text-right text-[10px] font-semibold text-white">{m.v}g</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2.5 space-y-2">
        {meals.map((m) => (
          <div key={m.m} className="flex items-center gap-3 rounded-card-sm border border-border-subtle bg-surface p-2">
            <div className="h-10 w-10 shrink-0 rounded-xl" style={{ background: `linear-gradient(135deg, ${m.c}, #171717)` }} />
            <div className="min-w-0 flex-1">
              <div className="text-[8px] font-semibold uppercase tracking-wide text-accent">{m.m}</div>
              <div className="truncate text-[11px] font-semibold text-white">{m.n}</div>
            </div>
            <span className="shrink-0 font-display text-[11px] font-bold text-text-2">{m.kc}</span>
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
      <ScreenHead title="AI Coach" sub="Always in your corner" />
      <div className="space-y-2.5">
        <div className="ml-auto max-w-[80%] rounded-2xl rounded-tr-md bg-accent px-3 py-2 text-[11px] font-medium text-white">
          My shoulder feels tight — swap today&rsquo;s overhead press?
        </div>
        <div className="mr-auto max-w-[88%] rounded-2xl rounded-tl-md border border-border-subtle bg-surface px-3 py-2 text-[11px] text-white">
          <span className="mb-1 flex items-center gap-1 text-[10px] font-bold text-accent">
            <Sparkles className="h-3 w-3" /> Coach
          </span>
          Done — subbed in a landmine press and added band pull-aparts to warm the joint. Volume&rsquo;s matched.
        </div>
        <div className="mr-auto flex items-center gap-2 rounded-2xl border border-border-subtle bg-surface px-2.5 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted">
            <Dumbbell className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] font-bold text-white">Landmine Press</div>
            <div className="text-[9px] text-text-2">3 × 10 · added to Push Day</div>
          </div>
          <Check className="h-4 w-4 text-[color:var(--success)]" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3 py-2.5">
        <Mic className="h-3.5 w-3.5 text-text-3" />
        <span className="text-[10px] text-text-3">Ask your coach anything…</span>
        <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-accent">
          <Flame className="h-3 w-3 text-white" />
        </span>
      </div>
    </div>
  );
}

/* ---- 0. Home dashboard ---- */
export function ScreenDashboard() {
  const week = [42, 0, 68, 0, 55, 80, 0];
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-text-2">Good morning</p>
          <h4 className="font-display text-[18px] font-extrabold leading-tight text-white">Alex</h4>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-accent-muted px-2.5 py-1 text-[11px] font-bold text-accent">
          <Flame className="h-3.5 w-3.5" /> 18
        </span>
      </div>

      {/* Next workout */}
      <div className="relative overflow-hidden rounded-card border border-accent/30 p-3.5" style={{ background: "linear-gradient(135deg,#ff520e,#7a1f05)" }}>
        <div aria-hidden className="absolute inset-0 opacity-15" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1.4px)", backgroundSize: "10px 10px" }} />
        <div className="relative">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-white/80">Today</span>
          <div className="font-display text-[16px] font-extrabold text-white">Push Day</div>
          <div className="mt-0.5 text-[11px] text-white/80">5 exercises · ~45 min</div>
          <div className="mt-2.5 flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-[#7a1f05]">
              <Play className="h-3 w-3" fill="currentColor" /> Start
            </span>
            <span className="text-[10px] text-white/70">Week 3 of 8</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { k: "Workouts", v: "4" },
          { k: "Volume", v: "12.4t" },
          { k: "PRs", v: "3" },
        ].map((s) => (
          <div key={s.k} className="rounded-card-sm border border-border-subtle bg-surface p-2.5 text-center">
            <div className="font-display text-[15px] font-extrabold text-white">{s.v}</div>
            <div className="text-[9px] uppercase tracking-wide text-text-3">{s.k}</div>
          </div>
        ))}
      </div>

      {/* Week activity */}
      <div className="mt-3 rounded-card border border-border-subtle bg-surface p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-white">This week</span>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[color:var(--success)]">
            <TrendingUp className="h-3 w-3" /> On track
          </span>
        </div>
        <div className="flex h-12 items-end gap-1.5">
          {week.map((v, i) => (
            <span key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(v, 6)}%`, background: v > 0 ? "#ff520e" : "rgba(255,255,255,.08)" }} />
          ))}
        </div>
        <div className="mt-1 flex gap-1.5">
          {labels.map((l, i) => (
            <span key={i} className="flex-1 text-center text-[8px] text-text-3">{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
