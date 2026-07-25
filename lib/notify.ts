import "server-only";
import { serviceSupabase, sendToSubscriptions } from "@/lib/push";

export interface Notification {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Deliver a notification to another user: writes the in-app notification row and
 * pushes to their subscribed devices. Uses the service role, so callers MUST
 * verify the sender is allowed to notify the recipient before calling (e.g. a
 * friend request or accepted friendship already exists). Best-effort — a push
 * failure never blocks the action, and a missing service key just skips push.
 */
export async function notifyUser(n: Notification): Promise<void> {
  try {
    const supabase = serviceSupabase();

    await supabase.from("notifications").insert({
      user_id: n.userId,
      type: n.type,
      title: n.title,
      body: n.body ?? null,
      link: n.link ?? null,
    });

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", n.userId);

    if (subs && subs.length > 0) {
      await sendToSubscriptions(supabase, subs, {
        title: n.title,
        body: n.body ?? "",
        url: n.link ?? "/dashboard",
        tag: n.type,
      });
    }
  } catch {
    // Best-effort: never let a notification/push failure break the action.
  }
}
