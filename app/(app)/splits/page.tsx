import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { SplitManager } from "@/components/splits/split-manager";

export const metadata = { title: "My Splits" };

export default async function SplitsPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: splits } = await supabase
    .from("custom_splits")
    .select("id, name, description, custom_split_days(id)")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false });

  const list = (splits ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    description: s.description as string | null,
    dayCount: Array.isArray(s.custom_split_days) ? s.custom_split_days.length : 0,
  }));

  return (
    <PageShell>
      <PageHeader
        title="My Splits"
        subtitle="Build your own training splits and fill each day with the exercises you choose."
      />
      <div className="mt-6">
        <SplitManager splits={list} />
      </div>
    </PageShell>
  );
}
