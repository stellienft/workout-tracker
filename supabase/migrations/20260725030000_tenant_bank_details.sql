-- Structured bank details so clients can pay a trainer by manual or recurring
-- bank transfer. Lives on tenants, whose read policy is limited to the owner
-- and the tenant's active clients — so these are never visible platform-wide.
alter table public.tenants
  add column if not exists bank_account_name text,
  add column if not exists bank_bsb text,
  add column if not exists bank_account_number text,
  add column if not exists bank_name text,
  add column if not exists payment_reference text;
