import Link from "next/link";
import { Sparkles } from "lucide-react";
import { requireTrainer, getAuthContext } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { FREE_TRAINER_CLIENT_LIMIT, TRAINER_PRICE_LABEL } from "@/lib/plan";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { createClient } from "@/lib/supabase/server";
import { ClientList } from "@/components/trainer/client-list";

export const metadata = { title: "Clients" };

export default async function TrainerClientsPage() {
  await requireTrainer();
  const { user } = await getAuthContext();
  const { isPro } = await getUserPlan();
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

  const [
    { data: clients },
    { data: programs },
    { data: assignments },
    { data: packages },
    { data: clientPkgs },
  ] = await Promise.all([
    supabase
      .from("trainer_clients")
      .select("id, user_id, display_name, status, subscription_active, assigned_at")
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
    supabase
      .from("trainer_packages")
      .select("id, name, price_cents, currency, interval")
      .eq("tenant_id", tenant.id)
      .eq("status", "active")
      .order("created_at", { ascending: false }),
    supabase
      .from("trainer_client_packages")
      .select("client_user_id, package_id, status")
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

  const activeOrPending = (clients ?? []).filter((c) =>
    ["active", "pending"].includes(c.status as string)
  ).length;
  const showUpgrade = !isPro && activeOrPending >= FREE_TRAINER_CLIENT_LIMIT;

  return (
    <PageShell>
      <PageHeader title="Clients" subtitle="Manage your coaching clients." />

      {showUpgrade && (
        <Link
          href="/billing"
          className="mt-6 flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--surface-primary)] p-4 ring-1 ring-[var(--accent-primary)]/20 transition-colors hover:border-[var(--border-active)]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-muted)] text-[var(--accent-primary)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1 text-sm">
            <span className="block font-semibold">
              You&apos;ve reached the free {FREE_TRAINER_CLIENT_LIMIT}-client limit
            </span>
            <span className="block text-[var(--text-muted)]">
              Upgrade to the Trainer plan ({TRAINER_PRICE_LABEL}) for unlimited
              clients, plus AI Coach, nutrition and more.
            </span>
          </span>
          <span className="shrink-0 text-sm font-semibold text-[var(--accent-primary)]">
            Upgrade
          </span>
        </Link>
      )}

      <div className="mt-6">
        <ClientList
          clients={clientList}
          programs={(programs ?? []).map((p) => ({
            id: p.id as string,
            name: p.name as string,
          }))}
          assignments={assignmentList}
          packages={(packages ?? []).map((p) => ({
            id: p.id as string,
            name: p.name as string,
            price_cents: p.price_cents as number,
            currency: p.currency as string,
            interval: p.interval as "monthly" | "weekly" | "one_off",
          }))}
          clientPackages={(clientPkgs ?? []).map((p) => ({
            clientUserId: p.client_user_id as string,
            packageId: p.package_id as string,
            status: p.status as "active" | "paused" | "cancelled",
          }))}
        />
      </div>
    </PageShell>
  );
}
