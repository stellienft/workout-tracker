import Image from "next/image";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { Apple, Check, ArrowRight } from "lucide-react";
import { PRO_PRICE_LABEL, TRAINER_PRICE_LABEL } from "@/lib/plan";
import { SiteNav } from "./site-nav";
import { Reveal } from "./reveal";
import { Faq } from "./faq";
import { AppStoreButton } from "./app-store-button";
import { AppleLogo } from "./apple-logo";
import { Phone, ScreenDashboard, ScreenWorkout, ScreenProgress, ScreenCoach, type Tab } from "./screens";
import { APP_STORE_URL } from "./config";

function Section({ id, children, className = "" }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-5xl scroll-mt-24 px-5 sm:px-6 ${className}`}>
      {children}
    </section>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">{children}</span>
  );
}

export function Landing() {
  return (
    <main className="relative overflow-hidden bg-bg text-white">
      <SiteNav />

      {/* ============ HERO ============ */}
      <Section className="relative pt-32 pb-20 text-center sm:pt-40 sm:pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full opacity-40 blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(255,82,14,.28), transparent 70%)" }}
        />
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3.5 py-1.5 text-xs font-medium text-text-2">
            <AppleLogo className="h-3.5 w-3.5 text-white" /> Exclusively on iOS
          </span>
        </Reveal>
        <Reveal delay={60}>
          <h1 className="mx-auto mt-7 max-w-3xl font-display text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-7xl">
            Train like a <span className="text-accent">god.</span>
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-text-2">
            The all-in-one strength coach — programs, logging, coaching and progress that actually
            motivates. Built for iPhone.
          </p>
        </Reveal>
        <Reveal delay={180}>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <AppStoreButton />
            <a href="#features" className="inline-flex items-center gap-2 text-sm font-semibold text-text-2 transition-colors hover:text-white">
              See how it works <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </Reveal>
        <Reveal delay={140}>
          <div className="relative mt-16 flex justify-center">
            <Phone tab="home" className="w-full max-w-[280px]">
              <ScreenDashboard />
            </Phone>
          </div>
        </Reveal>
      </Section>

      {/* ============ FEATURE ROWS ============ */}
      <Section id="features" className="space-y-24 py-20 sm:space-y-32 sm:py-28">
        <FeatureRow
          kicker="Train"
          title="Every rep, logged without friction."
          body="A focused workout mode with automatic rest timers, warm-ups counted into your time, and your last numbers right where you need them."
          screen={ScreenWorkout}
          tab="workouts"
        />
        <FeatureRow
          kicker="Progress"
          title="Watch yourself get stronger."
          body="Estimated 1RM, volume and streaks charted over time — quiet proof that the work is paying off."
          screen={ScreenProgress}
          tab="progress"
          flip
        />
        <FeatureRow
          kicker="Coach"
          title="A coach in your corner, 24/7."
          body="Ask for swaps, form cues or a plan for the day. Ares adjusts around your injuries and equipment and writes it straight into your session."
          screen={ScreenCoach}
          tab="home"
        />
      </Section>

      {/* ============ EVERYTHING ELSE ============ */}
      <Section className="py-16 text-center sm:py-20">
        <Reveal>
          <Kicker>And everything else</Kicker>
          <div className="mx-auto mt-6 flex max-w-2xl flex-wrap justify-center gap-x-3 gap-y-3">
            {EXTRAS.map((e) => (
              <span key={e} className="rounded-full border border-white/8 px-3.5 py-1.5 text-sm text-text-2">
                {e}
              </span>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* ============ iOS EXCLUSIVE ============ */}
      <Section className="py-16 sm:py-24">
        <Reveal>
          <div className="rounded-[28px] border border-white/8 bg-bg-2/50 px-6 py-14 text-center sm:px-12">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10">
              <Apple className="h-7 w-7 text-white" />
            </span>
            <h2 className="mx-auto mt-6 max-w-xl font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              Made for iPhone. Only.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-text-2">
              We build for one platform and build it right — native, fast and tuned to Apple Health
              and Apple Watch. No compromises.
            </p>
            <div className="mt-8 flex justify-center">
              <AppStoreButton />
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ============ PRICING ============ */}
      <Section id="pricing" className="py-16 sm:py-24">
        <Reveal className="mx-auto mb-12 max-w-xl text-center">
          <Kicker>Pricing</Kicker>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Start free. Go Pro when you&rsquo;re ready.
          </h2>
        </Reveal>
        <div className="grid gap-4 lg:grid-cols-3">
          <PriceCard name="Free" price="$0" tagline="The essentials, forever." features={["Workout logging & timers", "Programs & exercises", "Progress & achievements"]} />
          <PriceCard featured name="Pro" price={PRO_PRICE_LABEL} tagline="The full arsenal." features={["Everything in Free", "AI coach & meal plans", "Body composition & health", "Custom splits"]} />
          <PriceCard name="Trainer" price={TRAINER_PRICE_LABEL} tagline="For coaches with clients." features={["Unlimited clients", "Programming & check-ins", "Sell your own packages"]} />
        </div>
      </Section>

      {/* ============ FAQ ============ */}
      <Section id="faq" className="py-16 sm:py-24">
        <Reveal className="mx-auto mb-12 max-w-xl text-center">
          <Kicker>FAQ</Kicker>
          <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Questions, answered
          </h2>
        </Reveal>
        <Faq />
      </Section>

      {/* ============ CTA ============ */}
      <Section id="get" className="py-20 text-center sm:py-28">
        <Reveal>
          <Image src="/icons/apple-touch-icon.png" alt="Ares Fitness" width={72} height={72} className="mx-auto h-16 w-16 rounded-2xl shadow-[0_18px_50px_rgba(255,82,14,0.28)]" />
          <h2 className="mx-auto mt-6 max-w-xl font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Ready to train like a god?
          </h2>
          <div className="mt-8 flex justify-center">
            <AppStoreButton />
          </div>
          <p className="mt-5 text-sm text-text-3">Free to start · iPhone &amp; Apple Watch</p>
        </Reveal>
      </Section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-white/8 py-10">
        <Section className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <Image src="/logo.png" alt="Ares Fitness" width={34} height={34} className="h-8 w-auto" />
          <nav className="flex items-center gap-6 text-sm text-text-2">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <Link href="/legal/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-white">Terms</Link>
            <Link href="/login" className="hover:text-white">Log in</Link>
          </nav>
          <span className="text-xs text-text-3">© {new Date().getFullYear()} Ares Fitness</span>
        </Section>
      </footer>
    </main>
  );
}

/* ---------- sub-components ---------- */

function FeatureRow({
  kicker,
  title,
  body,
  screen: Screen,
  tab,
  flip = false,
}: {
  kicker: string;
  title: string;
  body: string;
  screen: ComponentType;
  tab: Tab;
  flip?: boolean;
}) {
  return (
    <Reveal>
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-20">
        <div className={flip ? "lg:order-2" : ""}>
          <Kicker>{kicker}</Kicker>
          <h3 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
            {title}
          </h3>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-text-2">{body}</p>
        </div>
        <div className={`flex justify-center ${flip ? "lg:order-1" : ""}`}>
          <Phone tab={tab} className="w-full max-w-[250px]">
            <Screen />
          </Phone>
        </div>
      </div>
    </Reveal>
  );
}

function PriceCard({
  name,
  price,
  tagline,
  features,
  featured = false,
}: {
  name: string;
  price: string;
  tagline: string;
  features: string[];
  featured?: boolean;
}) {
  return (
    <div className={`relative flex h-full flex-col rounded-3xl border p-7 ${featured ? "border-accent/50 bg-surface" : "border-white/8 bg-bg-2/40"}`}>
      {featured && (
        <span className="absolute -top-3 left-7 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
          Most popular
        </span>
      )}
      <h3 className="font-display text-lg font-extrabold text-white">{name}</h3>
      <div className="mt-3 flex items-end gap-1">
        <span className="font-display text-4xl font-extrabold text-white">{price.split("/")[0]}</span>
        {price.includes("/") && <span className="pb-1 text-sm text-text-2">/{price.split("/")[1]}</span>}
      </div>
      <p className="mt-2 text-sm text-text-2">{tagline}</p>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-sm text-text-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> <span>{f}</span>
          </li>
        ))}
      </ul>
      <a
        href={APP_STORE_URL}
        className={`mt-7 inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold transition-colors ${featured ? "bg-accent text-white hover:bg-accent-hover" : "border border-white/12 text-white hover:border-white/25"}`}
      >
        Get started
      </a>
    </div>
  );
}

const EXTRAS = [
  "Programs",
  "Meal plans",
  "Body composition",
  "Walking & activities",
  "Communities",
  "Achievements",
  "Voice journal",
  "Supplements",
  "Recovery",
  "Goals",
  "Schedule",
  "Apple Watch",
];
