import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { VoiceNote } from "@/components/journal/voice-note";
import { saveDailyJournal } from "@/lib/actions/journal";
import { todayInTz, DEFAULT_TZ } from "@/lib/timezone";
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
  const today = todayInTz((profile?.timezone as string | null) || DEFAULT_TZ);

  const { data: entries } = await supabase
    .from("journal_entries")
    .select("entry_date, body")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .limit(365);

  const todayEntry = (entries ?? []).find((e) => e.entry_date === today);
  // Past entries only — today's lives in the editor above.
  const rows = (entries ?? []).filter(
    (e) => e.entry_date !== today && (e.body as string)?.trim()
  );

  return (
    <PageShell>
      <PageHeader
        title="Journal"
        subtitle="Your daily notes — type them or dictate with the mic."
      />

      {/* Add / edit today's entry right here. */}
      <div className="mt-6">
        <VoiceNote
          save={saveDailyJournal.bind(null, today)}
          initialValue={(todayEntry?.body as string | null) ?? ""}
          title="Today's entry"
          hint="Add a note for today — type it, or tap the mic to talk."
          placeholder="Energy, sleep, mood, wins, what to tackle tomorrow…"
        />
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
            <NotebookPen className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <p className="mt-4 font-semibold">No past entries yet</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Save today’s note above — your past entries will collect here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((e) => (
            <article
              key={e.entry_date as string}
              className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
                {new Date(`${e.entry_date}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
                {e.body as string}
              </p>
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}
