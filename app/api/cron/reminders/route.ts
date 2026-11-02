import { NextResponse } from "next/server";
import { serviceSupabase, sendToSubscriptions } from "@/lib/push";
import { computeStreak } from "@/lib/streak";
import { isGlp1 } from "@/lib/glp1";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DEFAULT_TZ = "Australia/Brisbane";
const DAY = 86_400_000;

function localDate(d: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Daily reminder sender. Wire to a Vercel cron. Sends a nudge to anyone with
 * push enabled who hasn't completed a workout today (in their timezone).
 * Authorised via the CRON_SECRET bearer token Vercel attaches automatically.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    new URL(req.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceSupabase();

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth");
  if (!subs || subs.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const userIds = Array.from(new Set(subs.map((s) => s.user_id as string)));

  const [{ data: profiles }, { data: sessions }, { data: doses }, { data: markers }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, timezone, medication_tracking_enabled, metabolic_reminders_enabled")
        .in("id", userIds),
      supabase
        .from("workout_sessions")
        .select("user_id, completed_at")
        .eq("status", "completed")
        .in("user_id", userIds)
        .gte("completed_at", new Date(Date.now() - 8 * DAY).toISOString()),
      supabase
        .from("medication_logs")
        .select("user_id, medication_name, taken_on")
        .in("user_id", userIds)
        .order("taken_on", { ascending: false }),
      supabase
        .from("metabolic_markers")
        .select("user_id, recorded_on")
        .in("user_id", userIds)
        .order("recorded_on", { ascending: false }),
    ]);

  const tzByUser = new Map<string, string>(
    (profiles ?? []).map((p) => [p.id as string, (p.timezone as string) || DEFAULT_TZ])
  );
  const medEnabledByUser = new Map<string, boolean>(
    (profiles ?? []).map((p) => [p.id as string, !!p.medication_tracking_enabled])
  );
  const metabolicEnabledByUser = new Map<string, boolean>(
    (profiles ?? []).map((p) => [p.id as string, !!p.metabolic_reminders_enabled])
  );
  // Most recent metabolic-marker entry date per user (ordered newest-first).
  const lastMarkerByUser = new Map<string, string>();
  for (const m of markers ?? []) {
    const uid = m.user_id as string;
    if (!lastMarkerByUser.has(uid)) lastMarkerByUser.set(uid, m.recorded_on as string);
  }
  // Most recent GLP-1 dose date per user (doses are ordered newest-first).
  const lastGlp1DoseByUser = new Map<string, string>();
  for (const d of doses ?? []) {
    const uid = d.user_id as string;
    if (lastGlp1DoseByUser.has(uid)) continue;
    if (!isGlp1(d.medication_name as string | null)) continue;
    lastGlp1DoseByUser.set(uid, d.taken_on as string);
  }
  const sessionsByUser = new Map<string, string[]>();
  for (const s of sessions ?? []) {
    const arr = sessionsByUser.get(s.user_id as string) ?? [];
    arr.push(s.completed_at as string);
    sessionsByUser.set(s.user_id as string, arr);
  }
  const subsByUser = new Map<string, typeof subs>();
  for (const s of subs) {
    const arr = subsByUser.get(s.user_id as string) ?? [];
    arr.push(s);
    subsByUser.set(s.user_id as string, arr);
  }

  const now = new Date();
  let sent = 0;

  for (const uid of userIds) {
    const tz = tzByUser.get(uid) ?? DEFAULT_TZ;
    const today = localDate(now, tz);

    // Weekly GLP-1 dose reminder — fires on the day the next weekly dose is due
    // (last dose + 7 days), independent of the training nudge below.
    if (medEnabledByUser.get(uid)) {
      const last = lastGlp1DoseByUser.get(uid);
      if (last) {
        const dueOn = localDate(
          new Date(new Date(`${last}T12:00:00`).getTime() + 7 * DAY),
          tz
        );
        if (dueOn === today) {
          const r = await sendToSubscriptions(supabase, subsByUser.get(uid) ?? [], {
            title: "Weekly dose due 💉",
            body: "Time for your GLP-1 injection — remember to rotate your site.",
            url: "/health",
            tag: "dose-reminder",
          });
          sent += r.sent;
        }
      }
    }

    // Optional metabolic nudges (opt-in): a post-meal walk tip on Mon/Wed/Fri,
    // and a "re-check your markers" reminder ~90 days after the last entry.
    if (metabolicEnabledByUser.get(uid)) {
      const subsFor = subsByUser.get(uid) ?? [];
      const last = lastMarkerByUser.get(uid);
      const recheckOn = last
        ? localDate(new Date(new Date(`${last}T12:00:00`).getTime() + 90 * DAY), tz)
        : null;
      if (recheckOn && recheckOn === today) {
        const r = await sendToSubscriptions(supabase, subsFor, {
          title: "Time to re-check your markers 🩸",
          body: "It's been about 3 months — consider re-testing your fasting glucose, insulin and HbA1c.",
          url: "/metabolic",
          tag: "metabolic-recheck",
        });
        sent += r.sent;
      } else {
        const weekday = new Date(`${today}T12:00:00`).getUTCDay(); // 0=Sun..6=Sat
        if (weekday === 1 || weekday === 3 || weekday === 5) {
          const r = await sendToSubscriptions(supabase, subsFor, {
            title: "Walk after your biggest meal 🚶",
            body: "A 10–15 min walk after eating blunts the blood-sugar spike — great for insulin sensitivity.",
            url: "/metabolic",
            tag: "metabolic-walk",
          });
          sent += r.sent;
        }
      }
    }

    const dates = sessionsByUser.get(uid) ?? [];
    if (dates.some((d) => localDate(new Date(d), tz) === today)) continue; // trained today

    // A live streak (trained yesterday, not yet today) gets a stronger,
    // loss-averse nudge — that's the moment most worth saving.
    const streak = computeStreak(dates, tz, now);
    const trainedThisWeek = dates.filter(
      (d) => now.getTime() - new Date(d).getTime() <= 7 * DAY
    ).length;

    const { title, body } =
      streak.atRisk && streak.current >= 2
        ? {
            title: `Don't break your ${streak.current}-day streak 🔥`,
            body: "One session today keeps it alive.",
          }
        : {
            title: "Time to train",
            body:
              trainedThisWeek > 0
                ? "Keep the momentum going — time for today's session 💪"
                : "Your workout is waiting. Let's move 💪",
          };

    const res = await sendToSubscriptions(supabase, subsByUser.get(uid) ?? [], {
      title,
      body,
      url: "/dashboard",
      tag: "daily-reminder",
    });
    sent += res.sent;
  }

  return NextResponse.json({ ok: true, users: userIds.length, sent });
}
