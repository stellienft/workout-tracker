import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripeClient } from "@/lib/stripe";
import { serviceSupabase } from "@/lib/push";

export const dynamic = "force-dynamic";

interface SubRecord {
  user_id: string;
  plan: "free" | "pro";
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  updated_at: string;
}

function toRecord(sub: Stripe.Subscription): SubRecord | null {
  const userId = (sub.metadata?.userId as string | undefined) ?? null;
  if (!userId) return null;
  const active = sub.status === "active" || sub.status === "trialing";
  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end;
  return {
    user_id: userId,
    plan: active ? "pro" : "free",
    status: sub.status,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
}

export async function POST(req: Request) {
  const stripe = stripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 400 });
  }

  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig ?? "", secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = serviceSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subId = typeof session.subscription === "string" ? session.subscription : null;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          // Ensure the userId is on the subscription for later events.
          if (!sub.metadata?.userId && session.client_reference_id) {
            sub.metadata = { ...sub.metadata, userId: session.client_reference_id };
            await stripe.subscriptions.update(subId, {
              metadata: { userId: session.client_reference_id },
            });
          }
          const rec = toRecord(sub);
          if (rec) await supabase.from("subscriptions").upsert(rec, { onConflict: "user_id" });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const rec = toRecord(sub);
        if (rec) {
          if (event.type === "customer.subscription.deleted") {
            rec.plan = "free";
            rec.status = "canceled";
          }
          await supabase.from("subscriptions").upsert(rec, { onConflict: "user_id" });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
