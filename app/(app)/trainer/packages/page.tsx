import { requireTrainer, getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { TrainerPackages, type PackageRow } from "@/components/trainer/trainer-packages";

export const metadata = { title: "Packages" };

export default async function TrainerPackagesPage() {
  await requireTrainer();
  const { user } = await getAuthContext();
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_user_id", user!.id)
    .maybeSingle();

  const { data: packages } = tenant
    ? await supabase
        .from("trainer_packages")
        .select("id, name, description, price_cents, currency, interval, features, status")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  return (
    <PageShell>
      <PageHeader
        title="Packages"
        subtitle="Build your own coaching packages. Clients on an active package get full Pro access."
      />
      <div className="mt-6">
        <TrainerPackages packages={(packages ?? []) as PackageRow[]} />
      </div>
    </PageShell>
  );
}
