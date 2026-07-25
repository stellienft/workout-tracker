-- Trainers collect payment off-platform. Let them store their own payment link
-- (Stripe Payment Link, PayPal.me, etc.) and instructions, shown to their
-- clients on the coaching package.
alter table public.tenants
  add column if not exists payment_url text,
  add column if not exists payment_instructions text;
