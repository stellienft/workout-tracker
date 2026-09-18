# Stellio Fit

**Train Smarter. Build Stronger.**

A premium, mobile-first fitness platform built as a **reusable program and
workout engine** — not a single hard-coded program. The 12-week Beginner
Strength Foundations plan is the first complete program shipped on the engine,
alongside Bodybuilding, Fat Loss and General Fitness starter programs.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS v4, and Supabase
(Postgres + Auth + Row Level Security + Storage). Installable as a PWA.

---

## Features

- **Goal-based onboarding** — choose from 11 fitness goals, answer 8 quick
  questions, get tailored program recommendations (no auto-enrolment).
- **Program platform** — sequential, weekly-split, and calendar scheduling
  modes. Enrol, pause, resume, restart, switch (history is never deleted),
  and save programs.
- **Image-led dashboard** — today's workout hero, weekly completion ring,
  continue-unfinished, stats, recent activity, discovery, recovery prompt.
- **Full-screen workout mode** — one exercise at a time, set logging
  (weight/reps/RPE/pain), persistent rest timer, previous-performance display,
  exercise replacement with shoulder-safe swaps, offline set queue with
  auto-sync, save & resume.
- **Shoulder safety** — pre-workout shoulder check-in, per-exercise safety
  flags and substitutes, in-session alerts, pain reporting. The beginner
  program adapts around a sore left shoulder.
- **YouTube guidance** — privacy-enhanced embeds, thumbnail-first loading,
  "Watch on YouTube" fallback, written cues when video fails. Admin-managed
  and verifiable.
- **Tracking** — body metrics, strength/attendance/shoulder trends, daily &
  weekly check-ins, Mounjaro medication tracking, JSON/CSV export.
- **Admin** — server-role-gated management of users, goals, programs,
  exercises, videos, media, and featured content.
- **Home Hub** — a voice-controlled kiosk surface at `/hub` for a wall- or
  bench-mounted tablet: wake word, spoken replies, alarms and timers, weather,
  Spotify playback and multi-step routines. See [Home Hub](#home-hub).
- **PWA** — installable, offline fallback, service worker, safe-area aware.

---

## Tech stack

| Layer      | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 15 (App Router, Server Components + Actions) |
| Language   | TypeScript                                          |
| Styling    | Tailwind CSS v4 (dark, lime `#CCFF30` accent)       |
| Backend    | Supabase — Postgres, Auth, RLS, Storage             |
| Validation | Zod                                                 |
| Icons      | lucide-react                                        |
| Charts     | Dependency-free SVG (no chart library)              |
| Tests      | Vitest                                              |

---

## Getting started

### 1. Prerequisites

- Node.js 20+
- A Supabase project (free tier is fine)

### 2. Install

```bash
npm install
```

### 3. Configure environment

Copy the example and fill in your Supabase project values
(Dashboard → Project Settings → API):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never exposed
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Set up the database

The database is defined by, in order:

1. `supabase/migrations/20260718120000_schema.sql` — tables, functions, the
   super-admin trigger, and `updated_at` triggers.
2. `supabase/migrations/20260718120100_rls.sql` — Row Level Security policies
   and the `media` storage bucket.
3. `supabase/seed.sql` — roles, 11 goals, 4 programs (incl. the detailed
   shoulder-safe beginner program), exercises + substitutions, placeholder
   video records, featured content, and default settings. The seed is
   idempotent (fixed UUIDs + `ON CONFLICT DO NOTHING`).

Pick **one** of the two setup paths below.

#### Option A — Supabase CLI (recommended)

The CLI ships as a dev dependency, so `npm run …` resolves it (no global
install needed). One-time link to your hosted project:

```bash
npm run db:link -- --project-ref <your-project-ref>
```

Then apply schema + RLS + seed to your **hosted** project:

```bash
npm run db:setup      # supabase db reset --linked  (applies migrations + seed)
```

> `db:setup` wraps `supabase db reset --linked`, which rebuilds the linked
> database from the migrations and runs the seed. It's ideal for a brand-new
> project. It is **destructive**, so never point it at a database with real
> data — use `npm run db:push` (migrations only) after the first setup.

Everyday commands:

| Script                 | Does                                                        |
| ---------------------- | ---------------------------------------------------------- |
| `npm run supabase:start` | Start the full local Supabase stack (Docker)             |
| `npm run db:reset`     | Reset the **local** db (migrations + seed)                 |
| `npm run db:push`      | Push new migrations to the linked **remote** project       |
| `npm run db:new -- <name>` | Scaffold a new timestamped migration                   |
| `npm run db:diff -- <name>` | Write a migration from local schema changes           |

#### Option B — SQL editor (no CLI)

In the Supabase Dashboard → SQL editor, paste and run each file in order:
the two migration files, then `supabase/seed.sql`.

### 5. Run

```bash
npm run dev
```

Open <http://localhost:3000>. Create an account, complete onboarding, and
you're in.

---

## The reserved Super Administrator

The email **`hello@stellio.com.au`** is automatically granted the
`super_admin` role on first sign-in. This happens entirely in trusted
server-side code:

- A `SECURITY DEFINER` trigger (`handle_new_user`) on `auth.users` creates the
  profile, assigns the base `user` role, and — only for the normalised
  reserved email — assigns `super_admin`.
- The email is normalised (trimmed + lowercased) before comparison.
- The operation is **idempotent** (`ON CONFLICT DO NOTHING`), so it never
  creates duplicate role records.
- Role assignment is **never** based on client-side logic. Client-provided
  role values are never trusted; every admin route and mutation re-checks the
  role against the database, and RLS enforces the same rule at the row level.

A backup `ensure_bootstrap_admin()` function exists for accounts created
before the trigger was installed.

To sign in as the admin, create an account with `hello@stellio.com.au`; the
`Admin` destination appears in the sidebar automatically.

---

## Scheduling modes (the engine)

`lib/engine.ts` is a set of pure, unit-tested functions that resolve "what's
next" for any program:

- **Sequential** — required workouts form a repeating rotation (A, B, A, …).
  The enrolment's `next_workout_sequence` advances only when a required
  workout is completed, so **missed days never break the sequence**. Used by
  the beginner program.
- **Weekly split** — workouts occupy fixed positions in the training week; the
  next workout is the first position not yet completed this week. Used by the
  bodybuilding program.
- **Calendar** — workouts are pinned to weekdays.

Completing a workout advances the week once the weekly target is met and marks
the program complete after the final week.

---

## Project structure

```
app/
  (auth)/            login, signup
  (app)/             authenticated app (sidebar + bottom nav shell)
    dashboard/ workouts/ workout/ programs/ goals/
    exercises/ schedule/ progress/ check-ins/ medication/
    settings/ profile/
  admin/             server-role-gated admin area
  onboarding/        goal-based onboarding wizard
  hub/               Home Hub kiosk surface (no app chrome)
  api/export/        JSON/CSV data export
  api/hub/           weather, geocode, LLM intent fallback
  auth/callback/     email-confirmation code exchange
components/          UI, nav, dashboard, workout, tracking, admin
lib/
  supabase/          browser + server + middleware clients
  actions/           server actions (auth, onboarding, enrolment,
                     workout, tracking, admin)
  hub/               Home Hub: intent parsing, time parsing, alarms,
                     weather, speech recognition, TTS (pure where possible)
  engine.ts          scheduling engine (pure functions)
  auth.ts            server-side auth context + role guards
  queries.ts, dashboard.ts, workout-loader.ts
supabase/
  migrations/        schema + RLS
  seed.sql           goals, programs, exercises, videos, featured
tests/               vitest: engine, utils, hub voice logic
public/              manifest, service worker, icons
```

---

## Home Hub

`/hub` turns a cheap Android tablet into a voice-controlled home hub — the
Google/Alexa speaker replacement. It is an ordinary route in this app, gated by
the same Supabase auth, but it renders outside the `(app)` layout so there is no
sidebar or bottom nav to tap by accident.

### What it does

| Say | It does |
| --- | --- |
| "Hey Stellio, set an alarm for 6:14am" | Saves the alarm, replies "Sure, alarm set for tomorrow at 6:14 am." |
| "Wake me at 6 every weekday" | Recurring alarm, rolls forward after each ring |
| "Set a timer for 10 minutes" | Countdown, rings on the device |
| "Snooze" / "Stop" | Snoozes 9 minutes / dismisses the ring |
| "What's the weather tomorrow?" | Open-Meteo forecast, spoken |
| "Play Fleetwood Mac on Spotify" | Searches and plays on the tablet's Spotify app |
| "Skip" / "Pause" / "Turn it up" | Playback control |
| "What alarms do I have?" | Reads the list back |
| "Good morning" | Runs the routine: greeting, time, forecast, music |

Anything the local parser doesn't recognise falls through to
`/api/hub/interpret`, which maps unusual phrasings to the same intents and
answers general questions. That path needs `ANTHROPIC_API_KEY`; without it the
hub is local-only and simply says it didn't catch that.

### How the voice loop works

Everything runs in the browser — no always-on cloud microphone.

1. **Wake word** — `SpeechRecognition` (Chrome's Web Speech API) runs in a
   self-restarting loop. Recognition ends constantly on Android, so
   `lib/hub/speech.ts` restarts it, with exponential backoff on network errors.
   Wake matching is fuzzy (bounded edit distance) because recognisers reliably
   mangle invented names: "stelio", "stellium" and "stellio's" all wake it.
2. **Command** — once woken, the next utterance is captured (7s window) and
   parsed by `lib/hub/intents.ts`, which is pure and fully unit-tested.
3. **Reply** — `speechSynthesis` speaks the result. The recogniser is torn down
   while the hub talks, otherwise it hears itself and loops forever.

Browsers require a user gesture before a page may use the microphone or speak,
so the hub opens behind a "tap to start" gate that unlocks both.

### Alarms fire twice over, on purpose

Alarms are stored in Supabase (`hub_alarms`), not just in the tab:

- **Primary** — while the hub is open, the tablet schedules and rings alarms
  itself. Precise, works offline, and keeps ringing until dismissed.
- **Backup** — `/api/cron/hub-alarms` runs every minute and sends a web push for
  anything due. The hub heartbeats every 60s, and the cron skips members whose
  hub is live, so a ringing tablet never also buzzes your phone.

The every-minute cron in `vercel.json` needs a Vercel plan that allows
sub-daily crons. On the Hobby plan, either drop that entry (the tablet still
rings on its own) or trigger the endpoint from an external scheduler with the
`CRON_SECRET` bearer token.

### Setting up the tablet

1. Sign in to the app in **Chrome** (the Web Speech API is Chromium-only —
   Firefox won't listen). HTTPS is required for the microphone.
2. Open `/hub`, tap **Start the hub**, and allow the microphone when asked.
   Chrome remembers the grant for the origin.
3. Install it: Chrome menu → *Add to Home screen*. `/hub.webmanifest` gives the
   hub its own fullscreen, landscape icon separate from the main app.
4. In hub settings, set your weather location, pick a voice, and choose the
   Spotify device.
5. On the tablet: Settings → Display → Screen timeout as long as possible, and
   turn on *Developer options → Stay awake while charging*. The hub also holds a
   screen wake lock while it is open.

### Spotify

The hub reuses the existing Spotify OAuth connection but needs wider scopes
(`user-modify-playback-state` and friends), so **anyone connected before this
shipped must reconnect once** — the hub detects the missing scope and says so
rather than failing silently.

Two constraints are Spotify's, not ours:

- **Premium only.** The Web API refuses playback control on free accounts.
- **It controls a device, it doesn't play audio.** Install the Spotify app on
  the tablet, play something once so it registers as a Connect device, then pick
  it under hub settings → Music. Voice commands then drive that app, which is
  what comes out of the tablet's speakers.

### Routines

`hub_routines` maps a phrase to a list of steps (speak, read the time, read the
forecast, play music, pause music, wait). Two ship by default — "good morning"
and "good night" — and each can also run on a schedule.

---

## Security model

- **RLS everywhere.** Users read published system content and only their own
  private rows (enrolments, logs, check-ins, metrics, medication). Drafts are
  invisible to normal users.
- **Role assignment** is restricted to super admins (client-side) and the
  trusted server-side trigger. Normal users cannot modify roles or system
  content.
- **Admin routes** are guarded server-side (`requireAdmin`) and every admin
  mutation re-verifies the role before touching the database.
- **No secrets in the client.** Only the anon key and public URL are exposed;
  the service-role key is server-only.

---

## Images & YouTube

- Cover images are stored in the Supabase `media` bucket and referenced by
  path (never hard-coded stock URLs). Seeded placeholder records are marked
  `draft`; upload the real asset to the given path and publish via
  **Admin → Media**. Until then a branded placeholder tile renders.
- Exercise videos use YouTube only (never downloaded/hosted). Seeded records
  are `placeholder` (a YouTube search link) and clearly flagged in
  **Admin → Videos** — replace with a real URL and mark verified before they
  count as guidance.

---

## Scripts

```bash
npm run dev        # start dev server
npm run build      # production build (also type-checks)
npm run start      # start production server
npm run lint       # eslint
npm run test       # run vitest once
npm run test:watch # watch mode

# Supabase (CLI ships as a dev dependency)
npm run db:link -- --project-ref <ref>  # link a hosted project (once)
npm run db:setup   # apply migrations + seed to the linked project (destructive)
npm run db:push    # push new migrations to the linked project
npm run db:reset   # reset the LOCAL db (migrations + seed)
npm run supabase:start / supabase:stop  # local Supabase stack (Docker)
```

---

## Deployment

Deploy to any platform that supports Next.js (Vercel recommended):

1. Set the four environment variables from `.env.example` in your host.
2. Point `NEXT_PUBLIC_SITE_URL` at your deployed URL and add
   `<site>/auth/callback` to Supabase → Authentication → URL Configuration →
   Redirect URLs.
3. Apply the database once — `npm run db:link -- --project-ref <ref>` then
   `npm run db:setup` (or paste the SQL files via the dashboard, Option B).
4. Build & deploy.

---

## Scope (v1)

Included: workout logging, shoulder safety, progress, Mounjaro tracking,
programs, admin, PWA. **Not** included (by design): nutrition, social
networking, AI coaching, wearable integrations, marketplace.
