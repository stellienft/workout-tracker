-- Flag splits produced by the adaptive AI coach, so the UI can badge them and
-- regeneration can replace the previous auto-generated plan (not the member's
-- own hand-built splits).
alter table public.custom_splits
  add column if not exists ai_generated boolean not null default false;

create index if not exists custom_splits_ai_generated_idx
  on public.custom_splits (owner_user_id, ai_generated);
