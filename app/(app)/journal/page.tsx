import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { NotebookPen } from "lucide-react";

export const metadata = { title: "Journal" };

export default async function JournalPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("journal_entries")
    .select("entry_date, body")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .limit(365);

  const rows = (entries ?? []).filter((e) => (e.body as string)?.trim());

  return (
    <PageShell>
      <PageHeader
        title="Journal"
        subtitle="Your daily notes — typed or dictated from the dashboard."
      />

      {rows.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
            <NotebookPen className="h-8 w-8 text-[var(--text-muted)]" />
          </div>
          <p className="mt-4 font-semibold">No entries yet</p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Add a note from the “Today’s journal” card on your dashboard — type it,
            or tap the mic to talk.
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
