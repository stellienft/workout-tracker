-- iOS/Android in-app purchase entitlements, synced from RevenueCat webhooks.
-- Together with the Stripe `subscriptions` table these feed a single "is Pro"
-- flag, so a member is Pro whether they subscribed on the web or in the app.
CREATE TABLE IF NOT EXISTS public.app_store_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  entitlement text NOT NULL DEFAULT 'pro',
  is_active boolean NOT NULL DEFAULT false,
  store text,                       -- 'app_store' | 'play_store' | …
  product_id text,
  expires_at timestamptz,           -- null = non-expiring
  rc_app_user_id text,              -- RevenueCat app_user_id (usually our uuid)
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.app_store_entitlements ENABLE ROW LEVEL SECURITY;

-- Members may read their own entitlement; writes happen only from the webhook
-- using the service role (which bypasses RLS).
DROP POLICY IF EXISTS "app_store_entitlements_select_own" ON public.app_store_entitlements;
CREATE POLICY "app_store_entitlements_select_own" ON public.app_store_entitlements
  FOR SELECT USING (auth.uid() = user_id);
