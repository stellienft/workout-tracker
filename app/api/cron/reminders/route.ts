import { NextResponse } from "next/server";
import { serviceSupabase, sendToSubscriptions } from "@/lib/push";

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

  const [{ data: profiles }, { data: sessions }] = await Promise.all([
    supabase.from("profiles").select("id, timezone").in("id", userIds),
    supabase
      .from("workout_sessions")
      .select("user_id, completed_at")
      .eq("status", "completed")
      .in("user_id", userIds)
      .gte("completed_at", new Date(Date.now() - 8 * DAY).toISOString()),
  ]);

  const tzByUser = new Map<string, string>(
    (profiles ?? []).map((p) => [p.id as string, (p.timezone as string) || DEFAULT_TZ])
  );
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
    const dates = sessionsByUser.get(uid) ?? [];
    if (dates.some((d) => localDate(new Date(d), tz) === today)) continue; // trained today

    const trainedThisWeek = dates.filter(
      (d) => now.getTime() - new Date(d).getTime() <= 7 * DAY
    ).length;
    const body =
      trainedThisWeek > 0
        ? "Keep the momentum going — time for today's session 💪"
        : "Your workout is waiting. Let's move 💪";

    const res = await sendToSubscriptions(supabase, subsByUser.get(uid) ?? [], {
      title: "Time to train",
      body,
      url: "/dashboard",
      tag: "daily-reminder",
    });
    sent += res.sent;
  }

  return NextResponse.json({ ok: true, users: userIds.length, sent });
}
