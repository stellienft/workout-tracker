import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { ProgramCard } from "@/components/program-card";
import type { Program } from "@/lib/types";

export const metadata = { title: "Saved programs" };

export default async function SavedProgramsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("saved_programs")
    .select("program:programs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const programs = (data ?? [])
    .map((r) => r.program as unknown as Program)
    .filter((p) => p && p.status === "published");

  return (
    <PageShell>
      <PageHeader title="Saved programs" subtitle="Programs you've bookmarked." />
      {programs.length === 0 ? (
        <p className="mt-8 text-[var(--text-secondary)]">
          You haven&apos;t saved any programs yet. Browse the{" "}
          <a href="/programs" className="text-[var(--accent-primary)]">
            program library
          </a>{" "}
          and tap the bookmark.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {programs.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>
      )}
    </PageShell>
  );
}
