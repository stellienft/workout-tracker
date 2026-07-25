-- Referral program: invite a friend, both get a free month of Pro.

-- Each member gets a shareable referral code.
alter table public.profiles add column if not exists referral_code text unique;

-- Free Pro time granted outside Stripe (referrals, trials). Written only by the
-- server (service role) so members can't grant themselves — read-own only.
create table if not exists public.free_grants (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pro_until timestamptz not null,
  reason text,
  updated_at timestamptz not null default now()
);
alter table public.free_grants enable row level security;
drop policy if exists "read own free grant" on public.free_grants;
create policy "read own free grant" on public.free_grants
  for select to authenticated using (user_id = auth.uid());

-- One row per referred user (prevents double-crediting).
create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  referred_user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now(),
  unique (referred_user_id)
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_user_id);
alter table public.referrals enable row level security;
drop policy if exists "read own referrals" on public.referrals;
create policy "read own referrals" on public.referrals
  for select to authenticated
  using (referrer_user_id = auth.uid() or referred_user_id = auth.uid());
-- Writes via the service role only.
