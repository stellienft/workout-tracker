import "server-only";
import webpush from "web-push";
import { createClient as createServiceClient } from "@supabase/supabase-js";

let configured = false;

/** Configure web-push with the VAPID keys. Returns false if keys are missing. */
export function configurePush(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@stellio.com.au",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

interface SubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Send a notification to all of a user's subscriptions, pruning any that the
 * push service reports as gone (404/410). `supabase` must be able to delete the
 * rows (owner client for self-sends, service client for the cron sender).
 */
export async function sendToSubscriptions(
  supabase: {
    from: (t: string) => {
      delete: () => { eq: (c: string, v: string) => PromiseLike<unknown> };
    };
  },
  subs: SubRow[],
  payload: PushPayload
): Promise<{ sent: number; removed: number }> {
  if (!configurePush()) return { sent: 0, removed: 0 };
  let sent = 0;
  let removed = 0;
  const body = JSON.stringify(payload);

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", s.id);
          removed += 1;
        }
      }
    })
  );

  return { sent, removed };
}

/** Service-role Supabase client for the scheduled sender (bypasses RLS). */
export function serviceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
