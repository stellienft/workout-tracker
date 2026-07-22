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

  const [{ data: clients }, { data: programs }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("trainer_clients")
        .select(
          "id, user_id, display_name, status, subscription_active, assigned_at"
        )
        .eq("tenant_id", tenant.id)
        .order("assigned_at", { ascending: false }),
      supabase
        .from("trainer_programs")
        .select("id, name")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("trainer_assignments")
        .select("id, client_user_id, trainer_program_id, trainer_programs(name)")
        .eq("tenant_id", tenant.id),
    ]);

  // trainer_clients.user_id references auth.users (not profiles), so there's no
  // FK for a PostgREST embed — fetch the client profiles separately and merge.
  const clientUserIds = (clients ?? []).map((c) => c.user_id as string);
  const { data: clientProfiles } = clientUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", clientUserIds)
    : { data: [] };
  const profileById = new Map(
    (clientProfiles ?? []).map((p) => [p.id as string, p])
  );

  const clientList = (clients ?? []).map((c) => {
    const p = profileById.get(c.user_id as string);
    return {
      ...c,
      profiles: p
        ? { email: p.email as string, full_name: p.full_name as string | null }
        : null,
    };
  });

  const assignmentList = (assignments ?? []).map((a) => {
    const prog = Array.isArray(a.trainer_programs)
      ? a.trainer_programs[0]
      : a.trainer_programs;
    return {
      id: a.id as string,
      clientUserId: a.client_user_id as string,
      programName: (prog?.name as string) ?? "Program",
    };
  });

  return (
    <PageShell>
      <PageHeader title="Clients" subtitle="Manage your coaching clients." />
      <div className="mt-6">
        <ClientList
          clients={clientList}
          programs={(programs ?? []).map((p) => ({
            id: p.id as string,
            name: p.name as string,
          }))}
          assignments={assignmentList}
        />
      </div>
    </PageShell>
  );
}
