import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * RevenueCat webhook — the single sync point for in-app purchases (iOS App
 * Store / Google Play). RevenueCat posts subscriber lifecycle events here; we
 * translate them into a Pro entitlement row that `getUserPlan` reads, so an
 * in-app subscription unlocks Pro exactly like a web Stripe subscription.
 *
 * Setup:
 *  - RevenueCat → Project → Integrations → Webhooks → URL: /api/revenuecat/webhook
 *  - Set the Authorization header value to REVENUECAT_WEBHOOK_SECRET.
 *  - In the app, configure Purchases with the member's Supabase user id as the
 *    appUserID (Purchases.logIn(user.id)) so app_user_id maps to our uuid.
 *  - The paid entitlement in RevenueCat should be named "pro".
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Event types that mean the entitlement should currently be granted (until its
// expiry). CANCELLATION only turns off auto-renew — access lasts until expiry.
const GRANTING = new Set([
  "INITIAL_PURCHASE",
  "RENEWAL",
  "UNCANCELLATION",
  "PRODUCT_CHANGE",
  "NON_RENEWING_PURCHASE",
  "CANCELLATION",
  "SUBSCRIPTION_EXTENDED",
  "TEMPORARY_ENTITLEMENT_GRANT",
]);
// Event types that revoke access now.
const REVOKING = new Set(["EXPIRATION", "BILLING_ISSUE"]);

interface RcEvent {
  type?: string;
  app_user_id?: string;
  original_app_user_id?: string;
  entitlement_id?: string | null;
  entitlement_ids?: string[] | null;
  product_id?: string;
  store?: string;
  expiration_at_ms?: number | null;
}

function storeLabel(store?: string): string | null {
  if (!store) return null;
  const s = store.toUpperCase();
  if (s === "APP_STORE" || s === "MAC_APP_STORE") return "app_store";
  if (s === "PLAY_STORE") return "play_store";
  return store.toLowerCase();
}

export async function POST(req: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 });
  }
  // RevenueCat sends the configured value verbatim in the Authorization header.
  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "");
  if (provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let event: RcEvent;
  try {
    const body = (await req.json()) as { event?: RcEvent };
    event = body.event ?? {};
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const type = event.type ?? "";
  const appUserId = event.app_user_id ?? "";
  // Only act on events keyed to a real member (our Supabase uuid). Anonymous
  // ids ($RCAnonymousID:…) and transfers are acknowledged but skipped.
  if (!UUID_RE.test(appUserId)) {
    return NextResponse.json({ ok: true, skipped: "no_user" });
  }

  const entitlements = event.entitlement_ids ?? (event.entitlement_id ? [event.entitlement_id] : []);
  const isPro = entitlements.length === 0 || entitlements.includes("pro");
  if (!isPro) {
    return NextResponse.json({ ok: true, skipped: "other_entitlement" });
  }

  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const notExpired = !event.expiration_at_ms || event.expiration_at_ms > Date.now();

  let active: boolean;
  if (REVOKING.has(type)) active = false;
  else if (GRANTING.has(type)) active = notExpired;
  else active = notExpired; // unknown lifecycle event — trust the expiry

  const supabase = serviceSupabase();
  const { error } = await supabase.from("app_store_entitlements").upsert(
    {
      user_id: appUserId,
      entitlement: "pro",
      is_active: active,
      store: storeLabel(event.store),
      product_id: event.product_id ?? null,
      expires_at: expiresAt,
      rc_app_user_id: event.original_app_user_id ?? appUserId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, active });
}
