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
  api/export/        JSON/CSV data export
  auth/callback/     email-confirmation code exchange
components/          UI, nav, dashboard, workout, tracking, admin
lib/
  supabase/          browser + server + middleware clients
  actions/           server actions (auth, onboarding, enrolment,
                     workout, tracking, admin)
  engine.ts          scheduling engine (pure functions)
  auth.ts            server-side auth context + role guards
  queries.ts, dashboard.ts, workout-loader.ts
supabase/
  migrations/        schema + RLS
  seed.sql           goals, programs, exercises, videos, featured
tests/               vitest: engine + utils
public/              manifest, service worker, icons
```

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
