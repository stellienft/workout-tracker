import { requireTrainer, getAuthContext } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { ClientList } from "@/components/trainer/client-list";

export const metadata = { title: "Clients" };

export default async function TrainerClientsPage() {
  await requireTrainer();
  const { user } = await getAuthContext();
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_user_id", user!.id)
    .maybeSingle();

  if (!tenant) {
    return (
      <PageShell>
        <PageHeader title="Clients" subtitle="No tenant found." />
      </PageShell>
    );
  }

  const { data: clients } = await supabase
    .from("trainer_clients")
    .select(`
      id,
      user_id,
      display_name,
      status,
      subscription_active,
      assigned_at,
      profiles:user_id (email, full_name)
    `)
    .eq("tenant_id", tenant.id)
    .order("assigned_at", { ascending: false });

  // Supabase types a to-one join as an array; flatten it to a single object.
  const clientList = (clients ?? []).map((c) => ({
    ...c,
    profiles: Array.isArray(c.profiles) ? (c.profiles[0] ?? null) : c.profiles,
  }));

  return (
    <PageShell>
      <PageHeader title="Clients" subtitle="Manage your coaching clients." />
      <div className="mt-6">
        <ClientList clients={clientList} />
      </div>
    </PageShell>
  );
}
