import { NextResponse, after } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { serviceSupabase, sendToSubscriptions } from "@/lib/push";

// Hold the background task open long enough to cover a rest period. Requires a
// Vercel plan whose max duration allows this; on plans capped lower, rests
// longer than the cap simply won't get a server push (the on-screen timer and
// client-side notification still work).
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const MAX_REST_SECONDS = 300;

/**
 * Schedule (or cancel) a "rest complete" web push.
 *
 * On schedule we upsert a one-row-per-user reminder and, via `after()`, hold a
 * background task that sleeps until the rest ends and then pushes — but only if
 * the reminder is still active and still carries this request's token (so a
 * newer rest, a cancel, or an early finish supersedes it). `after()` runs
 * independently of the client connection, which is what lets the push fire even
 * once an iOS PWA has frozen its foreground JS.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body: {
    restSeconds?: number;
    cancel?: boolean;
    token?: string;
    url?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    // empty body — treated as a bad request below
  }

  const svc = serviceSupabase();

  // Cancel: deactivate this user's reminder. Scope to the token when we have
  // one so a stale unmount can't clobber a rest that just started.
  if (body.cancel) {
    let q = svc.from("rest_reminders").update({ active: false }).eq("user_id", user.id);
    if (body.token) q = q.eq("token", body.token);
    await q;
    return NextResponse.json({ ok: true, cancelled: true });
  }

  const restSeconds = Math.min(
    MAX_REST_SECONDS,
    Math.max(5, Math.round(Number(body.restSeconds) || 0))
  );
  if (!restSeconds) {
    return NextResponse.json({ ok: false, error: "restSeconds required" }, { status: 400 });
  }

  const token = randomUUID();
  const fireAt = Date.now() + restSeconds * 1000;
  const url = typeof body.url === "string" && body.url.startsWith("/") ? body.url : "/dashboard";

  await svc.from("rest_reminders").upsert({
    user_id: user.id,
    token,
    fire_at: new Date(fireAt).toISOString(),
    active: true,
    updated_at: new Date().toISOString(),
  });

  after(async () => {
    try {
      await sleep(Math.max(0, fireAt - Date.now()));

      // Only fire if this is still the active reminder (not cancelled/superseded).
      const { data: row } = await svc
        .from("rest_reminders")
        .select("token, active")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!row || !row.active || row.token !== token) return;

      const { data: subs } = await svc
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("user_id", user.id);
      if (subs && subs.length > 0) {
        // Same tag as the client-side notification so the two collapse into one
        // on platforms where both fire.
        await sendToSubscriptions(svc, subs, {
          title: "Rest complete 💪",
          body: "Time for your next set.",
          url,
          tag: "stellio-rest",
        });
      }

      // Clear so the reminder can't fire twice.
      await svc
        .from("rest_reminders")
        .update({ active: false })
        .eq("user_id", user.id)
        .eq("token", token);
    } catch {
      // Best-effort — a failed reminder must never surface as a request error.
    }
  });

  return NextResponse.json({ ok: true, scheduled: true, token });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
