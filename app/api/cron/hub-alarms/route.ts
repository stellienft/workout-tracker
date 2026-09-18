import { NextResponse } from "next/server";
import { serviceSupabase, sendToSubscriptions } from "@/lib/push";
import { nextFireAt } from "@/lib/hub/alarms";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Backup alarm delivery.
 *
 * The hub tablet schedules alarms locally and rings them itself, which is
 * precise and works offline — but only while the hub is actually open. This
 * cron is the safety net for everything else: the tablet asleep, the tab
 * closed, or the member away from the device. It pushes a notification and
 * advances the alarm exactly as dismissing it on the device would.
 *
 * Wire to an every-minute cron; alarms fired within the last two minutes are
 * caught, so a skipped run still delivers (late, rather than never).
 *
 * Authorised with the CRON_SECRET bearer token, like the other cron routes.
 */

const WINDOW_MS = 2 * 60_000;
/** A hub seen this recently is assumed to be ringing the alarm itself. */
const HUB_LIVE_MS = 90_000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided =
    req.headers.get("authorization")?.replace("Bearer ", "") ??
    new URL(req.url).searchParams.get("secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const supabase = serviceSupabase();
  const now = new Date();
  const from = new Date(now.getTime() - WINDOW_MS).toISOString();
  const to = now.toISOString();

  // Due = fire_at in the window, or an active snooze that has now elapsed.
  const { data: rows } = await supabase
    .from("hub_alarms")
    .select("id, user_id, kind, fire_at, label, repeat_days, snoozed_until, last_fired_at")
    .eq("enabled", true)
    .or(`and(snoozed_until.is.null,fire_at.gte.${from},fire_at.lte.${to}),and(snoozed_until.gte.${from},snoozed_until.lte.${to})`);

  if (!rows || rows.length === 0) return NextResponse.json({ ok: true, fired: 0 });

  // One lookup for every member in this batch, rather than per alarm.
  const userIds = [...new Set(rows.map((r) => (r as { user_id: string }).user_id))];
  const { data: hubs } = await supabase
    .from("hub_settings")
    .select("user_id, last_seen_at")
    .in("user_id", userIds);
  const liveHubs = new Set(
    (hubs ?? [])
      .filter((h) => {
        const seen = (h as { last_seen_at: string | null }).last_seen_at;
        return seen && now.getTime() - new Date(seen).getTime() < HUB_LIVE_MS;
      })
      .map((h) => (h as { user_id: string }).user_id)
  );

  let fired = 0;
  let pushed = 0;
  let skipped = 0;

  for (const row of rows) {
    const alarm = row as {
      id: string;
      user_id: string;
      kind: string;
      fire_at: string;
      label: string | null;
      repeat_days: number[] | null;
      snoozed_until: string | null;
      last_fired_at: string | null;
    };

    // Don't re-fire an alarm the tablet (or a previous run) already handled.
    if (alarm.last_fired_at && new Date(alarm.last_fired_at).getTime() > now.getTime() - WINDOW_MS) {
      continue;
    }

    // The hub is open on a device: it rings locally, so don't also push.
    if (liveHubs.has(alarm.user_id)) {
      skipped++;
      continue;
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .eq("user_id", alarm.user_id);

    if (subs && subs.length > 0) {
      const isTimer = alarm.kind === "timer";
      const result = await sendToSubscriptions(supabase, subs, {
        title: isTimer ? "Timer finished ⏰" : "Alarm ⏰",
        body: alarm.label ?? (isTimer ? "Your timer is done." : "Time to get up."),
        url: "/hub",
        tag: `hub-alarm-${alarm.id}`,
      });
      pushed += result.sent;
    }

    // Advance exactly as the device would: recurring rolls forward, one-shot
    // is disabled, and a spent timer is deleted.
    const next = nextFireAt(new Date(alarm.fire_at), alarm.repeat_days, now);
    if (next) {
      await supabase
        .from("hub_alarms")
        .update({
          fire_at: next.toISOString(),
          snoozed_until: null,
          last_fired_at: now.toISOString(),
        })
        .eq("id", alarm.id);
    } else if (alarm.kind === "timer") {
      await supabase.from("hub_alarms").delete().eq("id", alarm.id);
    } else {
      await supabase
        .from("hub_alarms")
        .update({
          enabled: false,
          snoozed_until: null,
          last_fired_at: now.toISOString(),
          dismissed_at: now.toISOString(),
        })
        .eq("id", alarm.id);
    }
    fired++;
  }

  return NextResponse.json({ ok: true, fired, pushed, skipped });
}
