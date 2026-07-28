import { NextResponse } from "next/server";
import { serviceSupabase, sendToSubscriptions } from "@/lib/push";
import { quoteForDate } from "@/lib/quotes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Morning motivation push. Sends the day's quote to members who opted in
 * (motivation_push_enabled) and have a push subscription. Wire to a Vercel cron.
 * Authorised via the CRON_SECRET bearer token.
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

  const { data: optedIn } = await supabase
    .from("profiles")
    .select("id")
    .eq("motivation_push_enabled", true);
  const ids = (optedIn ?? []).map((p) => p.id as string);
  if (ids.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", ids);
  if (!subs || subs.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const quote = quoteForDate();
  let sent = 0;

  // One send per user (their subscriptions batched).
  const byUser = new Map<string, typeof subs>();
  for (const s of subs) {
    const arr = byUser.get(s.user_id as string) ?? [];
    arr.push(s);
    byUser.set(s.user_id as string, arr);
  }

  for (const userSubs of byUser.values()) {
    const res = await sendToSubscriptions(supabase, userSubs, {
      title: "Daily motivation ✨",
      body: `"${quote.text}" — ${quote.author}`,
      url: "/dashboard",
      tag: "daily-motivation",
    });
    sent += res.sent;
  }

  return NextResponse.json({ ok: true, users: byUser.size, sent });
}
