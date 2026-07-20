-- Per-member timezone so week boundaries and "today" are computed in the
-- member's local time, not the server's UTC clock. Defaults to Brisbane.

alter table public.profiles
  add column if not exists timezone text not null default 'Australia/Brisbane';

comment on column public.profiles.timezone is
  'IANA timezone (e.g. Australia/Brisbane) used for week/day boundaries.';
