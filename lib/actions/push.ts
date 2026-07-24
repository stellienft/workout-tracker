"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendToSubscriptions } from "@/lib/push";

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

const subSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

/** Store (or refresh) a browser's push subscription for the current user. */
export async function savePushSubscription(input: z.input<typeof subSchema>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = subSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid subscription" };

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    },
    { onConflict: "endpoint" }
  );
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

/** Remove a subscription (member turned reminders off on this device). */
export async function deletePushSubscription(endpoint: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint);
  return { ok: true as const };
}

/** Fire a test notification to the member's own devices, to confirm setup. */
export async function sendTestPush() {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id);

  if (!subs || subs.length === 0) {
    return { ok: false as const, error: "No devices subscribed yet." };
  }

  const { sent } = await sendToSubscriptions(supabase, subs, {
    title: "Reminders are on 🔔",
    body: "We'll nudge you to keep your streak alive.",
    url: "/dashboard",
    tag: "test",
  });

  if (sent === 0)
    return {
      ok: false as const,
      error: "Couldn't send — push isn't configured on the server yet.",
    };
  return { ok: true as const, sent };
}
