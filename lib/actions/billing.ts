"use server";

import { getAuthContext } from "@/lib/auth";
import { stripeClient, isBillingConfigured, siteUrl } from "@/lib/stripe";

/** Start a Stripe Checkout for the Pro subscription; returns the redirect URL. */
export async function createCheckoutSession() {
  const { user, profile } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const stripe = stripeClient();
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripe || !priceId || !isBillingConfigured()) {
    return { ok: false as const, error: "Billing isn't configured yet." };
  }

  const email = profile?.email ?? user.email ?? undefined;

  // Reuse an existing Stripe customer if we have one (RLS lets users read own).
  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const customerId = (sub?.stripe_customer_id as string | null) ?? null;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${siteUrl()}/billing?success=1`,
      cancel_url: `${siteUrl()}/billing`,
      client_reference_id: user.id,
      subscription_data: { metadata: { userId: user.id } },
      allow_promotion_codes: true,
      ...(customerId ? { customer: customerId } : { customer_email: email }),
    });
    return { ok: true as const, url: session.url };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Could not start checkout",
    };
  }
}

/** Open the Stripe customer portal to manage/cancel the subscription. */
export async function createPortalSession() {
  const { user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const stripe = stripeClient();
  if (!stripe) return { ok: false as const, error: "Billing isn't configured yet." };

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const customerId = sub?.stripe_customer_id as string | null;
  if (!customerId) return { ok: false as const, error: "No subscription to manage yet." };

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl()}/billing`,
    });
    return { ok: true as const, url: session.url };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "Could not open billing portal",
    };
  }
}
