-- Turn the journal into an append-only log: each save is its own entry (card),
-- and entries can carry an optional voice recording.

-- Allow multiple entries per day.
ALTER TABLE public.journal_entries
  DROP CONSTRAINT IF EXISTS journal_entries_user_id_entry_date_key;

-- Optional audio recording (storage object path in the journal-audio bucket).
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS audio_path text;

CREATE INDEX IF NOT EXISTS journal_entries_user_created_idx
  ON public.journal_entries (user_id, created_at DESC);

-- Private bucket for journal voice notes.
INSERT INTO storage.buckets (id, name, public)
VALUES ('journal-audio', 'journal-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Owner-only access: files live under a folder named for the user's id.
DROP POLICY IF EXISTS "journal_audio_insert_own" ON storage.objects;
CREATE POLICY "journal_audio_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'journal-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "journal_audio_select_own" ON storage.objects;
CREATE POLICY "journal_audio_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'journal-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "journal_audio_delete_own" ON storage.objects;
CREATE POLICY "journal_audio_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'journal-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
