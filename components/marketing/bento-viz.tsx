import type { CSSProperties } from "react";
import { Play, Heart, Trophy } from "lucide-react";

/* ------------------------------------------------------------------ *
 * Small, animated mini-visuals for the bento tiles. Each one is a tidy
 * data-viz that echoes a real app screen. All animation is CSS and is
 * neutralised under prefers-reduced-motion by the global rule.
 * ------------------------------------------------------------------ */

/* Animated equaliser — Voice journal */
export function Waveform() {
  const bars = [7, 13, 21, 15, 27, 18, 31, 16, 23, 11, 29, 15, 9, 19, 25, 13, 20, 28, 14, 24, 10, 26, 17, 30, 12, 22, 16, 8];
  return (
    <div className="mt-5 flex h-10 w-full items-end gap-[2px]">
      {bars.map((h, i) => (
        <span key={i} className="ares-eq flex-1 rounded-full bg-accent/70" style={{ height: h + 8, animationDelay: `${(i % 12) * 90}ms` }} />
      ))}
    </div>
  );
}

/* Lean vs fat trend — Body composition */
export function BodyCompChart() {
  const lean = [30, 34, 33, 40, 44, 52, 58];
  const fat = [40, 38, 36, 34, 30, 27, 22];
  const w = 240;
  const h = 64;
  const step = w / (lean.length - 1);
  const max = 64;
  const path = (arr: number[]) => arr.map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (v / max) * h}`).join(" ");
  const leanLen = 340;
  return (
    <div className="mt-5">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full">
        <defs>
          <linearGradient id="bc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff520e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff520e" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path(lean)} L ${w} ${h} L 0 ${h} Z`} fill="url(#bc)" />
        <path d={path(fat)} fill="none" stroke="#4d9de0" strokeWidth="2.5" strokeDasharray="4 4" strokeLinecap="round" strokeLinejoin="round" />
        <path
          d={path(lean)}
          fill="none"
          stroke="#ff520e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={leanLen}
          style={{ ["--off" as string]: 0, strokeDashoffset: leanLen, animation: "ares-draw 1.5s ease .1s forwards" } as CSSProperties}
        />
      </svg>
      <div className="mt-2 flex gap-4 text-[11px]">
        <span className="flex items-center gap-1.5 text-text-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" /> Lean</span>
        <span className="flex items-center gap-1.5 text-text-2"><span className="h-1.5 w-1.5 rounded-full bg-[#4d9de0]" /> Fat</span>
      </div>
    </div>
  );
}

/* Weekly step bars — Walking */
export function StepBars() {
  const days = [58, 76, 44, 88, 66, 100, 82];
  const labels = ["M", "T", "W", "T", "F", "S", "S"];
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-baseline gap-1.5">
        <span className="font-display text-xl font-extrabold text-white">8,420</span>
        <span className="text-[11px] text-text-2">avg steps</span>
      </div>
      <div className="flex h-12 items-end gap-1.5">
        {days.map((v, i) => (
          <span key={i} className="ares-eq flex-1 rounded-sm" style={{ height: `${v}%`, background: i === 5 ? "#ff520e" : "rgba(255,82,14,.28)", animationDelay: `${i * 120}ms`, animationDuration: "2.4s" }} />
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {labels.map((l, i) => (
          <span key={i} className="flex-1 text-center text-[8px] text-text-3">{l}</span>
        ))}
      </div>
    </div>
  );
}

/* Video thumbnails w/ scrub — Exercise library */
export function ExerciseViz() {
  const thumbs = ["#c2410c", "#7c3f14", "#a16207"];
  return (
    <div className="mt-5">
      <div className="flex gap-2">
        {thumbs.map((c, i) => (
          <div key={i} className="relative h-12 flex-1 overflow-hidden rounded-lg" style={{ background: `linear-gradient(135deg, ${c}, #171717)` }}>
            {i === 0 && (
              <span className="absolute inset-0 flex items-center justify-center">
                <Play className="h-4 w-4 text-white" fill="currentColor" />
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="ares-progress h-full rounded-full bg-accent" />
      </div>
    </div>
  );
}

/* Avatar stack + live dot — Communities */
export function CommunitiesViz() {
  const av = ["#ff520e", "#4d9de0", "#22c55e", "#f5b942"];
  return (
    <div className="mt-5 flex items-center gap-3">
      <div className="flex -space-x-2">
        {av.map((c, i) => (
          <span key={i} className="h-7 w-7 rounded-full border-2 border-surface" style={{ background: `linear-gradient(135deg, ${c}, #111)` }} />
        ))}
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-surface-2 text-[9px] font-bold text-text-2">+9</span>
      </div>
      <span className="flex items-center gap-1.5 text-[11px] text-text-2">
        <span className="ares-pulse h-2 w-2 rounded-full" style={{ background: "#22c55e" }} />
        1,240 lifting now
      </span>
    </div>
  );
}

/* Before / after — Check-ins */
export function CheckinsViz() {
  return (
    <div className="mt-5 flex items-center gap-2">
      {[
        { l: "Wk 1", c: "#3a3a3a" },
        { l: "Wk 8", c: "#5a3115" },
      ].map((b) => (
        <div key={b.l} className="relative h-16 flex-1 overflow-hidden rounded-lg" style={{ background: `linear-gradient(135deg, ${b.c}, #141414)` }}>
          <span className="absolute bottom-1 left-1.5 text-[9px] font-semibold text-white/80">{b.l}</span>
        </div>
      ))}
      <div className="w-14 text-center">
        <div className="ares-pulse font-display text-[15px] font-extrabold text-accent">-4.2cm</div>
        <div className="text-[9px] text-text-3">waist</div>
      </div>
    </div>
  );
}

/* Reusable animated progress ring */
function Ring({ pct, size = 44, stroke = 5, color = "#ff520e", label, delay = 0 }: { pct: number; size?: number; stroke?: number; color?: string; label?: string; delay?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - pct);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ ["--off" as string]: off, strokeDashoffset: c, animation: `ares-draw 1.4s ease ${delay}ms forwards` } as CSSProperties}
        />
      </svg>
      {label && <span className="absolute font-display text-[10px] font-bold text-white">{label}</span>}
    </div>
  );
}

/* Macro rings — Meal plans */
export function MealsViz() {
  const macros = [
    { k: "P", pct: 0.82, c: "#ff520e" },
    { k: "C", pct: 0.64, c: "#f5b942" },
    { k: "F", pct: 0.48, c: "#4d9de0" },
  ];
  return (
    <div className="mt-5 flex justify-around">
      {macros.map((m, i) => (
        <div key={m.k} className="flex flex-col items-center gap-1.5">
          <Ring pct={m.pct} color={m.c} label={m.k} delay={i * 150} />
          <span className="text-[9px] text-text-3">{Math.round(m.pct * 100)}%</span>
        </div>
      ))}
    </div>
  );
}

/* Weekly streak capsules — Supplements */
export function SupplementsViz() {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-text-2">
        <span className="font-display font-extrabold text-white">5</span> day streak
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className={`h-6 flex-1 rounded-full ${i < 5 ? "bg-accent" : "bg-surface-2"} ${i === 4 ? "ares-pulse" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}

/* ECG line + heart — Recovery */
export function RecoveryViz() {
  const d = "M0 20 L26 20 L34 8 L44 32 L52 20 L78 20 L86 12 L96 26 L104 20 L150 20";
  return (
    <div className="mt-5 flex items-center gap-3">
      <svg viewBox="0 0 150 40" className="h-10 flex-1">
        <path
          d={d}
          fill="none"
          stroke="#ff520e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="320"
          style={{ ["--off" as string]: 0, strokeDashoffset: 320, animation: "ares-draw 1.8s ease forwards" } as CSSProperties}
        />
      </svg>
      <div className="flex items-center gap-1.5">
        <Heart className="ares-pulse h-4 w-4 text-accent" fill="currentColor" />
        <span className="font-display text-sm font-extrabold text-white">82%</span>
      </div>
    </div>
  );
}

/* Goal progress ring — Goals */
export function GoalsViz() {
  return (
    <div className="mt-5 flex items-center gap-4">
      <Ring pct={0.72} size={56} stroke={6} label="72%" />
      <div className="text-[11px] leading-tight text-text-2">
        <div className="font-semibold text-white">Bench 100 kg</div>
        <div>28 kg to go</div>
      </div>
    </div>
  );
}

/* Week schedule strip — Schedule */
export function ScheduleViz() {
  const days = [
    { l: "M", on: true },
    { l: "T", on: false },
    { l: "W", on: true, today: true },
    { l: "T", on: false },
    { l: "F", on: true },
    { l: "S", on: true },
    { l: "S", on: false },
  ];
  return (
    <div className="mt-5 flex gap-1.5">
      {days.map((d, i) => (
        <div
          key={i}
          className={`flex flex-1 flex-col items-center gap-1 rounded-lg py-2 ${d.today ? "bg-accent-muted ring-1 ring-accent/50" : "bg-surface-2"}`}
        >
          <span className="text-[9px] text-text-3">{d.l}</span>
          <span className={`h-1.5 w-1.5 rounded-full ${d.on ? "bg-accent" : "bg-white/10"} ${d.today ? "ares-pulse" : ""}`} />
        </div>
      ))}
    </div>
  );
}

/* Activity rings — Apple Watch */
export function WatchViz() {
  const rings = [
    { r: 26, pct: 0.78, c: "#ff520e" },
    { r: 19, pct: 0.62, c: "#4d9de0" },
    { r: 12, pct: 0.9, c: "#22c55e" },
  ];
  const size = 64;
  return (
    <div className="mt-5 flex items-center gap-4">
      <svg width={size} height={size} className="-rotate-90">
        {rings.map((rg, i) => {
          const circ = 2 * Math.PI * rg.r;
          const off = circ * (1 - rg.pct);
          return (
            <g key={i}>
              <circle cx={size / 2} cy={size / 2} r={rg.r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="5" />
              <circle
                cx={size / 2}
                cy={size / 2}
                r={rg.r}
                fill="none"
                stroke={rg.c}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circ}
                style={{ ["--off" as string]: off, strokeDashoffset: circ, animation: `ares-draw 1.4s ease ${i * 150}ms forwards` } as CSSProperties}
              />
            </g>
          );
        })}
      </svg>
      <div className="text-[11px] leading-tight text-text-2">
        <div className="font-semibold text-white">Wrist controls</div>
        <div>Log sets &amp; rest, hands-free</div>
      </div>
    </div>
  );
}

/* Referral progress — Refer a friend */
export function ReferViz() {
  const av = ["#ff520e", "#4d9de0", "#3a3a3a"];
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[11px]">
        <span className="text-text-2">2 of 3 joined</span>
        <span className="font-semibold text-accent">Free month</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {av.map((c, i) => (
            <span key={i} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface text-[8px] font-bold text-white/70" style={{ background: i < 2 ? `linear-gradient(135deg, ${c}, #111)` : "#222" }}>
              {i === 2 ? "?" : ""}
            </span>
          ))}
        </div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent" style={{ width: "66%" }}>
            <span className="ares-pulse block h-full w-full rounded-full bg-accent" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Premium milestone share card — the featured tile */
export function ShareCard() {
  return (
    <div className="relative w-full overflow-hidden rounded-[22px] border border-accent/25 bg-gradient-to-b from-[#1f0f06] via-[#150b05] to-[#0b0705] p-4 text-center shadow-[0_30px_70px_-30px_rgba(255,82,14,.7)] sm:rounded-[26px] sm:p-5">
      <div aria-hidden className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "radial-gradient(#ff520e 1px, transparent 1.5px)", backgroundSize: "11px 11px" }} />
      <div className="relative">
        <span className="text-[8px] font-bold uppercase tracking-[0.24em] text-accent sm:text-[9px] sm:tracking-[0.28em]">Milestone</span>
        <div className="relative mx-auto mt-3 flex h-16 w-16 items-center justify-center sm:mt-4 sm:h-24 sm:w-24">
          <span aria-hidden className="ares-pulse absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle, rgba(255,82,14,.55), transparent 68%)" }} />
          <span className="ares-float relative flex h-16 w-16 items-center justify-center rounded-full border border-accent/50 bg-black/40 backdrop-blur sm:h-24 sm:w-24">
            <Trophy className="h-7 w-7 text-accent sm:h-11 sm:w-11" />
          </span>
        </div>
        <div className="mt-3 font-display text-[22px] font-extrabold leading-none text-white sm:mt-4 sm:text-[26px]">25</div>
        <div className="mt-1 font-display text-[11px] font-bold uppercase tracking-wide text-white sm:text-[13px]">Workouts</div>
        <p className="mx-auto mt-2.5 max-w-[150px] text-[9px] italic leading-snug text-text-2 sm:mt-3 sm:text-[9.5px]">
          &ldquo;The iron does not lie — you have earned this ground.&rdquo;
        </p>
        <div className="mt-3 flex items-center justify-center gap-1.5 sm:mt-4">
          <span className="h-1 w-1 rounded-full bg-white/25" />
          <span className="h-1 w-6 rounded-full bg-accent" />
          <span className="h-1 w-1 rounded-full bg-white/25" />
        </div>
      </div>
    </div>
  );
}
