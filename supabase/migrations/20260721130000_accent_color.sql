-- Persist the accent colour on the profile so appearance (theme + accent)
-- fully syncs across devices. theme_preference already exists.

alter table public.profiles
  add column if not exists accent_color text not null default '#ccff30';

comment on column public.profiles.accent_color is 'User-chosen accent colour (hex).';
