-- Stellio Fit defaults to its dark charcoal look. The theme_preference column
-- previously defaulted to 'system', which resolves to light on light-mode
-- devices — not the intended first impression. Make dark the default for new
-- profiles, and move existing accounts that never explicitly picked a theme
-- (still on the old 'system' default) to dark. Members can re-select System or
-- Light any time in Settings.

alter table public.profiles
  alter column theme_preference set default 'dark';

update public.profiles
  set theme_preference = 'dark'
  where theme_preference = 'system';
