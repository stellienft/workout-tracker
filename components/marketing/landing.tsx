import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import {
  Star,
  Check,
  Dumbbell,
  Target,
  Download,
  Flame,
  Mic,
  Footprints,
  UsersRound,
  Ruler,
  Medal,
  ClipboardCheck,
  FlaskConical,
  HeartPulse,
  Calendar,
  Gift,
  Watch,
  Library,
  Sparkles,
  UtensilsCrossed,
  TrendingUp,
  Briefcase,
  MessageSquare,
  Package,
  ArrowRight,
} from "lucide-react";
import { PRO_PRICE_LABEL, TRAINER_PRICE_LABEL } from "@/lib/plan";
import { SiteNav } from "./site-nav";
import { FeatureExplorer } from "./feature-explorer";
import { Faq } from "./faq";
import { Reveal } from "./reveal";
import { AppStoreButton } from "./app-store-button";
import { Phone, ScreenDashboard } from "./screens";
import {
  Waveform,
  BodyCompChart,
  StepBars,
  ExerciseViz,
  CommunitiesViz,
  CheckinsViz,
  MealsViz,
  SupplementsViz,
  RecoveryViz,
  GoalsViz,
  ScheduleViz,
  ReferViz,
  WatchViz,
  ShareCard,
} from "./bento-viz";
import { AppleLogo } from "./apple-logo";
import { APP_STORE_URL } from "./config";

/* ---------- small helpers ---------- */

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-muted px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
      {children}
    </span>
  );
}

function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-6xl scroll-mt-20 px-4 sm:px-6 ${className}`}>
      {children}
    </section>
  );
}

/* ---------- page ---------- */

export function Landing() {
  return (
    <main className="relative overflow-hidden bg-bg text-white">
      {/* global backdrop glow + halftone */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(120% 60% at 50% -10%, rgba(255,82,14,.14), transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(#ff520e 1px, transparent 1.5px)",
            backgroundSize: "18px 18px",
          }}
        />
      </div>

      <SiteNav />

      {/* ============ HERO ============ */}
      <Section className="relative pt-28 pb-16 sm:pt-32 sm:pb-24">
        {/* mascot behind — centered, faint */}
        <Image
          src="/mascot.png"
          alt=""
          aria-hidden
          width={560}
          height={680}
          priority
          className="pointer-events-none absolute left-1/2 top-2 -z-0 w-[420px] max-w-none -translate-x-1/2 opacity-[0.07] blur-[1px] sm:w-[560px] sm:opacity-[0.1]"
        />
        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <Reveal>
            <Eyebrow>
              <AppleLogo className="h-3.5 w-3.5" /> Exclusively on iOS
            </Eyebrow>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              Train like
              <br />a <span className="text-accent">god.</span>
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-2">
              Ares is your all-in-one strength coach — programs, logging, nutrition, AI coaching
              and progress that actually motivates. Forged for iPhone.
            </p>
          </Reveal>
          <Reveal delay={180}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <AppStoreButton />
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-2xl border border-border-subtle px-5 py-3 font-semibold text-white transition-colors hover:border-white/25"
              >
                See the features <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </Reveal>
          <Reveal delay={240}>
            <p className="mt-5 flex items-center justify-center gap-2 text-sm text-text-3">
              <Download className="h-4 w-4" /> iPhone &amp; Apple Watch · Free to start
            </p>
          </Reveal>
        </div>

        {/* dashboard phone below, centered, with floating cards */}
        <Reveal delay={140} className="relative mt-16 flex justify-center">
          <div className="relative">
            <Phone tab="home">
              <ScreenDashboard />
            </Phone>
            {/* floating stat cards — sit outside the phone edges (desktop only) */}
            <div className="absolute right-full top-24 mr-4 hidden rotate-[-6deg] rounded-2xl border border-border-subtle bg-surface/90 p-3 shadow-xl backdrop-blur lg:block">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted">
                  <Flame className="h-4 w-4 text-accent" />
                </span>
                <div className="whitespace-nowrap">
                  <div className="font-display text-sm font-extrabold leading-none">18 days</div>
                  <div className="text-[10px] text-text-2">current streak</div>
                </div>
              </div>
            </div>
            <div className="absolute bottom-28 left-full ml-4 hidden rotate-[5deg] rounded-2xl border border-border-subtle bg-surface/90 p-3 shadow-xl backdrop-blur lg:block">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-muted">
                  <TrendingUp className="h-4 w-4 text-accent" />
                </span>
                <div className="whitespace-nowrap">
                  <div className="font-display text-sm font-extrabold leading-none">+14% 1RM</div>
                  <div className="text-[10px] text-text-2">this block</div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ============ STAT MARQUEE ============ */}
      <div className="relative border-y border-white/8 bg-bg-2/60 py-5">
        <div className="flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <div className="ares-marquee flex shrink-0 items-center gap-10 pr-10">
            {MARQUEE.concat(MARQUEE).map((m, i) => (
              <span key={i} className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-text-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ============ INTERACTIVE FEATURES ============ */}
      <Section id="features" className="py-20 sm:py-28">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow>
            <Sparkles className="h-3.5 w-3.5" /> Everything, one app
          </Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            One tap through your whole training life
          </h2>
          <p className="mt-4 text-lg text-text-2">
            Tap a feature to see it in action. This is what showing up looks like inside Ares.
          </p>
        </Reveal>
        <FeatureExplorer />
      </Section>

      {/* ============ BENTO — everything we built ============ */}
      <Section id="bento" className="py-20 sm:py-28">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow>
            <Dumbbell className="h-3.5 w-3.5" /> The full arsenal
          </Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Every tool you need to get strong
          </h2>
          <p className="mt-4 text-lg text-text-2">
            Ares is deep. Here&rsquo;s the rest of what&rsquo;s waiting inside.
          </p>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Featured wide tile — Achievements */}
          <Reveal className="sm:col-span-2">
            <div className="relative flex h-full flex-row items-center gap-4 overflow-hidden rounded-card border border-border-subtle bg-gradient-to-br from-surface via-surface to-bg-2 p-5 sm:gap-8 sm:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
                style={{ background: "radial-gradient(circle, rgba(255,82,14,.22), transparent 70%)" }}
              />
              <div className="relative flex-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-muted">
                  <Medal className="h-6 w-6 text-accent" />
                </span>
                <h3 className="mt-4 font-display text-xl font-extrabold sm:text-2xl">Shareable milestones</h3>
                <p className="mt-2 text-sm text-text-2 sm:text-base">
                  Hit a PR, streak or volume milestone and Ares mints a share card with a god-voice
                  line to match — made to look good on your story.
                </p>
              </div>
              <div className="relative w-32 shrink-0 sm:w-48">
                <ShareCard />
              </div>
            </div>
          </Reveal>

          {/* Featured tile — Voice journal */}
          <Reveal delay={60}>
            <BentoCard icon={Mic} title="Voice journal">
              Speak your reflections after a session — Ares saves the audio and a searchable
              transcript, so your mindset progress is tracked too.
              <Waveform />
            </BentoCard>
          </Reveal>

          {/* Rich tile — Body composition trend */}
          <Reveal>
            <BentoCard icon={Ruler} title="Body composition">
              Track lean mass vs fat and watch the trend line, not the noise.
              <BodyCompChart />
            </BentoCard>
          </Reveal>

          {/* Rich tile — Walking */}
          <Reveal delay={60}>
            <BentoCard icon={Footprints} title="Walking &amp; activities">
              Steps, cardio and every session logged in one place.
              <StepBars />
            </BentoCard>
          </Reveal>

          {[
            { icon: Library, t: "Exercise library", d: "Hundreds of movements with video guides and cues.", viz: ExerciseViz },
            { icon: UsersRound, t: "Communities & feed", d: "Share workouts, follow friends and train together.", viz: CommunitiesViz },
            { icon: ClipboardCheck, t: "Check-ins", d: "Weekly measurements and progress photos, side by side.", viz: CheckinsViz },
            { icon: UtensilsCrossed, t: "Meal plans", d: "7-day recipe rotations with macros matched to your goal.", viz: MealsViz },
            { icon: FlaskConical, t: "Supplements", d: "Build a stack and get reminders to stay consistent.", viz: SupplementsViz },
            { icon: HeartPulse, t: "Recovery", d: "Mobility and therapy routines to keep you training.", viz: RecoveryViz },
            { icon: Target, t: "Goals", d: "Set targets and watch every session close the gap.", viz: GoalsViz },
            { icon: Watch, t: "Apple Watch", d: "Log sets and start rest timers from your wrist.", viz: WatchViz },
            { icon: Calendar, t: "Schedule", d: "Plan your training week and never miss a session.", viz: ScheduleViz },
            { icon: Gift, t: "Refer a friend", d: "Invite mates and earn Pro when they join.", viz: ReferViz },
          ].map((b, i) => (
            <Reveal key={b.t} delay={(i % 3) * 60}>
              <BentoCard icon={b.icon} title={b.t}>
                {b.d}
                <b.viz />
              </BentoCard>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ============ HOW IT WORKS ============ */}
      <Section className="py-20 sm:py-28">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow>
            <Target className="h-3.5 w-3.5" /> How it works
          </Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Three steps to stronger
          </h2>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-3">
          {([
            { n: "01", icon: AppleLogo, t: "Download on iOS", d: "Grab Ares from the App Store and sign in with Apple in seconds." },
            { n: "02", icon: Dumbbell, t: "Pick your path", d: "Choose a program and goal — or let the AI coach build one around you." },
            { n: "03", icon: Flame, t: "Train & track", d: "Log every set, watch your numbers climb, and share the milestones." },
          ] as { n: string; icon: ComponentType<{ className?: string }>; t: string; d: string }[]).map((s, i) => (
            <Reveal key={s.n} delay={i * 80}>
              <div className="relative h-full rounded-card border border-border-subtle bg-surface p-6">
                <span className="font-display text-5xl font-extrabold text-white/10">{s.n}</span>
                <span className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-muted">
                  <s.icon className="h-6 w-6 text-accent" />
                </span>
                <h3 className="mt-4 font-display text-xl font-extrabold">{s.t}</h3>
                <p className="mt-2 text-text-2">{s.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ============ FOR TRAINERS ============ */}
      <Section id="trainers" className="py-20 sm:py-28">
        <div className="overflow-hidden rounded-[32px] border border-border-subtle bg-gradient-to-br from-surface to-bg-2 p-8 sm:p-12">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <Reveal>
              <Eyebrow>
                <Briefcase className="h-3.5 w-3.5" /> For coaches
              </Eyebrow>
              <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                Coach clients. Charge for it.
              </h2>
              <p className="mt-4 text-lg text-text-2">
                Ares isn&rsquo;t just for lifters. Personal trainers get a full portal to program for
                clients, track their progress and run their business — all in the same app.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  { icon: UsersRound, t: "Program & assign workouts to every client" },
                  { icon: TrendingUp, t: "See each client's progress and check-ins" },
                  { icon: MessageSquare, t: "Message clients right inside the app" },
                  { icon: Package, t: "Sell coaching packages and get paid" },
                ].map((r) => (
                  <li key={r.t} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-muted">
                      <r.icon className="h-4 w-4 text-accent" />
                    </span>
                    <span className="text-text-2">{r.t}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-accent px-5 py-3 font-bold text-white transition-transform hover:-translate-y-0.5"
              >
                Become a coach <ArrowRight className="h-4 w-4" />
              </Link>
            </Reveal>
            <Reveal delay={100}>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-card border border-border-subtle bg-bg p-5">
                  <div className="font-display text-3xl font-extrabold text-accent">Unlimited</div>
                  <div className="mt-1 text-sm text-text-2">clients on the Trainer plan</div>
                </div>
                <div className="rounded-card border border-border-subtle bg-bg p-5">
                  <div className="font-display text-3xl font-extrabold text-accent">{TRAINER_PRICE_LABEL}</div>
                  <div className="mt-1 text-sm text-text-2">flat, no per-seat fees</div>
                </div>
                <div className="col-span-2 rounded-card border border-border-subtle bg-bg p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-muted">
                      <Package className="h-5 w-5 text-accent" />
                    </span>
                    <div>
                      <div className="font-display font-extrabold">Your own packages</div>
                      <div className="text-sm text-text-2">Set your price, sell, and coach — Ares handles the rest.</div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      {/* ============ iOS EXCLUSIVE ============ */}
      <Section className="py-20 sm:py-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] border border-accent/25 bg-gradient-to-b from-[#1a0f08] to-bg p-8 text-center sm:p-14">
            <Image
              src="/mascot.png"
              alt=""
              aria-hidden
              width={400}
              height={480}
              className="pointer-events-none absolute -bottom-10 -right-6 w-52 opacity-20 sm:w-72"
            />
            <div className="relative mx-auto max-w-2xl">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-black/40">
                <AppleLogo className="h-8 w-8 text-white" />
              </span>
              <h2 className="mt-6 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
                Exclusively on iOS
              </h2>
              <p className="mt-4 text-lg text-text-2">
                We build for one platform and build it right. Ares is designed natively for iPhone
                and Apple Watch — fast, private, and tuned to Apple&rsquo;s health ecosystem. No
                compromises, no watered-down cross-platform build.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {["Native iPhone app", "Apple Watch ready", "Sign in with Apple", "Apple Health"].map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-2 rounded-full border border-border-subtle bg-bg px-4 py-2 text-sm font-semibold text-text-2"
                  >
                    <Check className="h-4 w-4 text-accent" /> {t}
                  </span>
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <AppStoreButton />
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ============ PRICING ============ */}
      <Section id="pricing" className="py-20 sm:py-28">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow>
            <Star className="h-3.5 w-3.5" /> Simple pricing
          </Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Start free. Go Pro when you&rsquo;re ready.
          </h2>
          <p className="mt-4 text-lg text-text-2">
            One membership across iPhone and the web — never charged twice.
          </p>
        </Reveal>

        <div className="grid items-stretch gap-5 lg:grid-cols-3">
          {/* Free */}
          <Reveal>
            <PriceCard
              name="Free"
              price="$0"
              tagline="The essentials, forever."
              features={[
                "Workout logging & rest timers",
                "Programs & exercise library",
                "Progress tracking & achievements",
                "Community feed & friends",
              ]}
              cta="Get started"
            />
          </Reveal>
          {/* Pro */}
          <Reveal delay={80}>
            <PriceCard
              featured
              name="Pro"
              price={PRO_PRICE_LABEL}
              tagline="Unlock the full arsenal."
              features={[
                "Everything in Free",
                "AI coach & smart swaps",
                "Meal plans & nutrition",
                "Body composition & health",
                "Custom splits & supplements",
              ]}
              cta="Start Pro"
            />
          </Reveal>
          {/* Trainer */}
          <Reveal delay={160}>
            <PriceCard
              name="Trainer"
              price={TRAINER_PRICE_LABEL}
              tagline="For coaches with clients."
              features={[
                "Unlimited coaching clients",
                "Client programming & progress",
                "In-app messaging",
                "Sell your own packages",
              ]}
              cta="Become a coach"
            />
          </Reveal>
        </div>
      </Section>

      {/* ============ TESTIMONIALS ============ */}
      {/* NOTE: illustrative quotes — swap for real member reviews before a public launch. */}
      <Section className="py-20 sm:py-28">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow>
            <Flame className="h-3.5 w-3.5" /> Built for people who show up
          </Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            The mindset, in their words
          </h2>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 70}>
              <figure className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-6">
                <div className="mb-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-accent text-accent" />
                  ))}
                </div>
                <blockquote className="flex-1 text-[15px] leading-relaxed text-white">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-muted font-display text-sm font-extrabold text-accent">
                    {t.name[0]}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-white">{t.name}</span>
                    <span className="block text-xs text-text-2">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ============ FAQ ============ */}
      <Section id="faq" className="py-20 sm:py-28">
        <Reveal className="mx-auto mb-14 max-w-2xl text-center">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="mt-4 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Questions, answered
          </h2>
        </Reveal>
        <Faq />
      </Section>

      {/* ============ FINAL CTA ============ */}
      <Section id="get" className="py-20 sm:py-28">
        <Reveal>
          <div className="relative overflow-hidden rounded-[32px] border border-accent/30 bg-gradient-to-br from-accent/20 via-surface to-bg p-10 text-center sm:p-16">
            <div
              aria-hidden
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage: "radial-gradient(#ff520e 1px, transparent 1.6px)",
                backgroundSize: "14px 14px",
              }}
            />
            <div className="relative">
              <Image
                src="/logo.png"
                alt="Ares Fitness"
                width={64}
                height={64}
                className="mx-auto mb-6 h-14 w-auto"
              />
              <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
                Ready to train like a god?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-text-2">
                Download Ares Fitness on iOS and turn showing up into the best physique of your life.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <AppStoreButton />
                <a
                  href={APP_STORE_URL}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-5 py-3 font-semibold text-white transition-colors hover:border-white/40"
                >
                  <AppleLogo className="h-4 w-4" /> iPhone &amp; Apple Watch
                </a>
              </div>
              <p className="mt-5 text-sm text-text-3">Free to start · Coming soon to the App Store</p>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-white/8 py-12">
        <Section>
          <div className="flex flex-col items-center justify-between gap-8 sm:flex-row sm:items-start">
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center gap-2.5 sm:justify-start">
                <Image src="/logo.png" alt="Ares Fitness" width={30} height={30} className="h-7 w-auto" />
                <span className="font-display text-lg font-extrabold text-white">
                  ARES <span className="text-accent">FITNESS</span>
                </span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-text-2">
                The all-in-one strength coach. Forged for iPhone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-center sm:text-left">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-text-3">Product</span>
                <a href="#features" className="text-sm text-text-2 hover:text-white">Features</a>
                <a href="#pricing" className="text-sm text-text-2 hover:text-white">Pricing</a>
                <a href="#trainers" className="text-sm text-text-2 hover:text-white">For trainers</a>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-text-3">Company</span>
                <Link href="/legal/privacy" className="text-sm text-text-2 hover:text-white">Privacy</Link>
                <Link href="/legal/terms" className="text-sm text-text-2 hover:text-white">Terms</Link>
                <Link href="/login" className="text-sm text-text-2 hover:text-white">Log in</Link>
              </div>
            </div>
          </div>
          <div className="mt-10 border-t border-white/8 pt-6 text-center text-xs text-text-3">
            © {new Date().getFullYear()} Ares Fitness. All rights reserved.
          </div>
        </Section>
      </footer>
    </main>
  );
}

/* ---------- sub-components & data ---------- */

function BentoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Dumbbell;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-card border border-border-subtle bg-surface p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_20px_50px_-30px_rgba(255,82,14,.6)]">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-muted">
        <Icon className="h-6 w-6 text-accent" />
      </span>
      <h3 className="mt-4 font-display text-lg font-extrabold">{title}</h3>
      <div className="mt-2 text-sm leading-relaxed text-text-2">{children}</div>
    </div>
  );
}


function PriceCard({
  name,
  price,
  tagline,
  features,
  cta,
  featured = false,
}: {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  cta: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-card border p-7 ${
        featured
          ? "border-accent/60 bg-surface shadow-[0_30px_80px_-40px_rgba(255,82,14,.6)]"
          : "border-border-subtle bg-surface/60"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          Most popular
        </span>
      )}
      <h3 className="font-display text-xl font-extrabold text-white">{name}</h3>
      <div className="mt-3 flex items-end gap-1">
        <span className="font-display text-4xl font-extrabold text-white">{price.split("/")[0]}</span>
        {price.includes("/") && <span className="pb-1 text-sm text-text-2">/{price.split("/")[1]}</span>}
      </div>
      <p className="mt-2 text-sm text-text-2">{tagline}</p>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-text-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href={APP_STORE_URL}
        className={`mt-7 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold transition-transform hover:-translate-y-0.5 ${
          featured ? "bg-accent text-white" : "border border-border-subtle text-white hover:border-white/25"
        }`}
      >
        {cta}
      </a>
    </div>
  );
}

const MARQUEE = [
  "Programs for every goal",
  "AI coaching",
  "Meal plans & nutrition",
  "Progress that motivates",
  "Shareable milestones",
  "Voice journaling",
  "Body composition",
  "Built for iPhone",
];

const TESTIMONIALS = [
  {
    name: "Marcus",
    role: "Push / Pull / Legs",
    quote:
      "The rest timers and warm-up tracking mean my logged time is finally honest. Watching my 1RM line climb is stupidly motivating.",
  },
  {
    name: "Priya",
    role: "Cutting phase",
    quote:
      "Meal plans that actually match real recipes, plus body-comp tracking, made my cut the first one I've ever finished.",
  },
  {
    name: "Dane",
    role: "Personal trainer",
    quote:
      "I run my whole coaching roster from the trainer portal now. Programming, check-ins and packages in one place.",
  },
];
