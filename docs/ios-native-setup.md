# iOS native: RevenueCat (IAP) + Sign in with Apple

This backend work is shared by the web app and a future React Native app — both
talk to the same Supabase project, the same RevenueCat webhook, and the same
Apple provider.

## Unified "is Pro" flag

`getUserPlan()` (`lib/entitlements.ts`) now grants Pro from **any** of:

1. An active Stripe subscription (`subscriptions` table) — web checkout.
2. An active RevenueCat entitlement (`app_store_entitlements` table) — iOS/Android IAP.
3. An active coaching package, or an unexpired free grant.

So a member is Pro whether they paid on the web or in the app. Nothing else in
the app needs to know where the purchase happened.

## RevenueCat (in-app subscriptions)

Apple/Google require **In-App Purchase** for digital subscriptions inside the
app — you can't unlock in-app Pro with the web Stripe checkout. RevenueCat wraps
StoreKit/Play Billing and posts entitlement changes to our webhook.

**Webhook:** `POST /api/revenuecat/webhook` (implemented in
`app/api/revenuecat/webhook/route.ts`). It:

- checks the `Authorization` header equals `REVENUECAT_WEBHOOK_SECRET`,
- reads `event.app_user_id` (must be the member's Supabase user id),
- upserts `app_store_entitlements` (active + expiry) for the `pro` entitlement.

**Dashboard setup (RevenueCat):**

1. Create a project; add your App Store (and Play) app + the `pro` **entitlement**.
2. Create the subscription **products** (e.g. `pro_monthly`, `pro_yearly`) and
   attach them to the `pro` entitlement.
3. Integrations → Webhooks → URL `https://<your-domain>/api/revenuecat/webhook`,
   and set the **Authorization header value** to a strong secret.

**Env vars (Vercel + `.env`):**

- `REVENUECAT_WEBHOOK_SECRET` — the same value you set as the webhook's
  Authorization header. (Server-side; never shipped to the client.)
- The RN app additionally needs the RevenueCat **public SDK key** (client-side).

**React Native client (later):**

```ts
import Purchases from "react-native-purchases";

// After Supabase auth resolves the member:
Purchases.configure({ apiKey: RC_PUBLIC_SDK_KEY, appUserID: session.user.id });

// Paywall → purchase:
const offerings = await Purchases.getOfferings();
await Purchases.purchasePackage(offerings.current!.availablePackages[0]);
// The webhook flips app_store_entitlements → getUserPlan() returns Pro.
```

Because `appUserID` is the Supabase user id, the webhook's `app_user_id` maps
straight onto our `user_id`. Anonymous ids and other entitlements are ignored.

## Sign in with Apple

The web button is wired (`components/auth-form.tsx`, `provider: "apple"` via
Supabase OAuth). Two setup steps that must be done in dashboards:

1. **Apple Developer:** create a Services ID, enable Sign in with Apple, add the
   return URL `https://<supabase-ref>.supabase.co/auth/v1/callback`, and create a
   Sign in with Apple **key**.
2. **Supabase → Authentication → Providers → Apple:** paste the Services ID
   (client id), Team ID, Key ID and the `.p8` key. Add your app's redirect URLs.

**React Native (later):** use native Sign in with Apple and hand the identity
token to Supabase:

```ts
import { appleAuth } from "@invertase/react-native-apple-authentication";
const res = await appleAuth.performRequest({ requestedOperation: appleAuth.Operation.LOGIN });
await supabase.auth.signInWithIdToken({ provider: "apple", token: res.identityToken! });
```

Apple requires Sign in with Apple to be offered wherever other social logins are
(you have Google), so this is also needed for App Store approval.
