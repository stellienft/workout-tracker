import { requireTrainer, getAuthContext } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { TrainerBrandingForm } from "@/components/trainer/branding-form";
import { TrainerProgramList } from "@/components/trainer/program-list";
import { TrainerVideoList } from "@/components/trainer/video-list";

export const metadata = { title: "Trainer Portal" };

export default async function TrainerPage() {
  await requireTrainer();
  const { user } = await getAuthContext();
  const supabase = await createClient();

  // Get or check tenant
  let { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("owner_user_id", user!.id)
    .maybeSingle();

  // Auto-create if missing
  if (!tenant) {
    const name = user?.user_metadata?.full_name || "My Training Business";
    const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${slugBase}-${Date.now().toString(36)}`;
    const { data: newTenant, error: createError } = await supabase
      .from("tenants")
      .insert({ owner_user_id: user!.id, name, slug })
      .select("*")
      .single();
    if (createError || !newTenant) {
      return (
        <PageShell>
          <PageHeader
            title="Trainer Portal"
            subtitle="Your white-label coaching business."
          />
          <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 text-sm">
            <p className="font-semibold">We couldn&apos;t set up your workspace</p>
            <p className="mt-1 text-[var(--text-secondary)]">
              Your trainer workspace couldn&apos;t be created. This usually means
              the database setup for the trainer portal hasn&apos;t finished yet.
              Please try again shortly.
            </p>
            {createError?.message && (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Details: {createError.message}
              </p>
            )}
          </div>
        </PageShell>
      );
    }
    tenant = newTenant;
  }

  // Get stats and lists
  const [
    { count: clientCount },
    { count: programCount },
    { count: videoCount },
    { data: programs },
    { data: videos },
  ] = await Promise.all([
    supabase.from("trainer_clients").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase.from("trainer_programs").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase.from("trainer_videos").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
    supabase.from("trainer_programs").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("trainer_videos").select("*").eq("tenant_id", tenant.id).order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <PageShell>
      <PageHeader
        title="Trainer Portal"
        subtitle="Your white-label coaching business."
        action={
          <Link
            href="/trainer/clients"
            className="rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black"
          >
            View Clients
          </Link>
        }
      />

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard label="Clients" value={clientCount ?? 0} />
        <StatCard label="Programs" value={programCount ?? 0} />
        <StatCard label="Videos" value={videoCount ?? 0} />
      </div>

      {/* Branding */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Branding</h2>
        <TrainerBrandingForm tenant={tenant} />
      </div>

      {/* Programs */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Programs</h2>
        <TrainerProgramList tenantId={tenant.id} programs={programs ?? []} />
      </div>

      {/* Videos */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Videos</h2>
        <TrainerVideoList tenantId={tenant.id} videos={videos ?? []} />
      </div>
    </PageShell>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-center">
      <p className="text-2xl font-bold text-[var(--accent-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
