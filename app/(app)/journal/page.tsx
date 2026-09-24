import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { VoiceNote } from "@/components/journal/voice-note";
import { JournalList, type JournalItem } from "@/components/journal/journal-list";
import { addJournalEntry } from "@/lib/actions/journal";
import { DEFAULT_TZ } from "@/lib/timezone";
import { NotebookPen } from "lucide-react";

export const metadata = { title: "Journal" };

export default async function JournalPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const tz = (profile?.timezone as string | null) || DEFAULT_TZ;

  const { data: rows } = await supabase
    .from("journal_entries")
    .select("id, body, audio_path, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
    });

  // Signed URLs for any attached audio (private bucket).
  const entries: JournalItem[] = [];
  for (const r of rows ?? []) {
    let audioUrl: string | null = null;
    const path = r.audio_path as string | null;
    if (path) {
      const { data } = await supabase.storage
        .from("journal-audio")
        .createSignedUrl(path, 60 * 60);
      audioUrl = data?.signedUrl ?? null;
    }
    entries.push({
      id: r.id as string,
      when: fmt(r.created_at as string),
      body: (r.body as string) ?? "",
      audioUrl,
    });
  }

  return (
    <PageShell>
      <PageHeader
        title="Journal"
        subtitle="Your notes — type or record them, and read them back anytime."
      />

      {/* New entry — each save creates its own card below. */}
      <div className="mt-6">
        <VoiceNote
          save={addJournalEntry}
          title="New entry"
          hint="Write or record a note — tap Save and it's added below."
          placeholder="How did today go? Energy, mood, wins, what to tackle next…"
          clearOnSave
          audio
          saveLabel="Save entry"
        />
      </div>

      {entries.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
            <NotebookPen className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <p className="mt-4 font-semibold">No entries yet</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Save your first note above — every entry you add shows up here.
          </p>
        </div>
      ) : (
        <div className="mt-6">
          <JournalList entries={entries} />
        </div>
      )}
    </PageShell>
  );
}
