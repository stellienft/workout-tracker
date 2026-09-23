-- Free-form daily journal entries (typed or dictated via voice-to-text on the
-- dashboard). One entry per member per day.
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, entry_date)
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "journal_entries_select_own" ON public.journal_entries;
CREATE POLICY "journal_entries_select_own" ON public.journal_entries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_entries_insert_own" ON public.journal_entries;
CREATE POLICY "journal_entries_insert_own" ON public.journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_entries_update_own" ON public.journal_entries;
CREATE POLICY "journal_entries_update_own" ON public.journal_entries
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "journal_entries_delete_own" ON public.journal_entries;
CREATE POLICY "journal_entries_delete_own" ON public.journal_entries
  FOR DELETE USING (auth.uid() = user_id);
