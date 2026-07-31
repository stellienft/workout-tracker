import "server-only";
import Stripe from "stripe";

let client: Stripe | null = null;

/** Stripe client, or null when billing isn't configured yet. */
export function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  // Pin the API version to the one this SDK targets, so responses match the
  // types we code against regardless of the account's dashboard default (e.g.
  // where current_period_end lives on the subscription).
  if (!client) client = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  return client;
}

export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}

/** Trainer plan checkout needs its own $15/mo price. */
export function isTrainerBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_TRAINER_PRICE_ID);
}

/** Absolute base URL for Stripe redirect/callback URLs. */
export function siteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://www.stellio.fit")
  );
}
