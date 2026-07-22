import Link from "next/link";
import { ChevronRight, Dumbbell } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { SplitManager } from "@/components/splits/split-manager";
import { SplitTemplates } from "@/components/splits/split-templates";

export const metadata = { title: "My Splits" };

export default async function SplitsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: splits } = await supabase
    .from("custom_splits")
    .select("id, name, description, source, custom_split_days(id)")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  const all = (splits ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    description: s.description as string | null,
    source: (s.source as string) ?? "self",
    dayCount: Array.isArray(s.custom_split_days) ? s.custom_split_days.length : 0,
  }));

  const coachSplits = all.filter((s) => s.source === "coach");
  const ownSplits = all.filter((s) => s.source !== "coach");

  return (
    <PageShell>
      <PageHeader
        title="My Splits"
        subtitle="Build your own training splits and fill each day with the exercises you choose."
      />

      {coachSplits.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
            From your coach
          </h2>
          <div className="grid gap-3">
            {coachSplits.map((s) => (
              <Link
                key={s.id}
                href={`/splits/${s.id}`}
                className="flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--accent-muted)] p-4"
              >
                <Dumbbell className="h-5 w-5 shrink-0 text-[var(--accent-primary)]" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {s.dayCount} {s.dayCount === 1 ? "day" : "days"}
                    {s.description ? ` · ${s.description}` : ""}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8">
        <SplitTemplates />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold">
          {ownSplits.length > 0 ? "Your splits" : "Or build your own"}
        </h2>
        <SplitManager splits={ownSplits} />
      </div>
    </PageShell>
  );
}
