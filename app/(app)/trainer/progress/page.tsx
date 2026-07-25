import Link from "next/link";
import { requireTrainer, getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { AlertTriangle, TrendingDown, TrendingUp, Minus } from "lucide-react";

export const metadata = { title: "Client Progress" };

interface Progress {
  client_user_id: string;
  last_session_at: string | null;
  sessions_7d: number;
  sessions_30d: number;
  total_sessions: number;
  latest_weight: number | null;
  weight_change_30d: number | null;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function status(days: number | null): { label: string; className: string } {
  if (days === null) return { label: "No sessions", className: "bg-[var(--surface-secondary)] text-[var(--text-muted)]" };
  if (days <= 7) return { label: "On track", className: "bg-[var(--accent-muted)] text-[var(--accent-primary)]" };
  if (days <= 14) return { label: "Slowing", className: "bg-[var(--warning)]/15 text-[var(--warning)]" };
  return { label: "At risk", className: "bg-[var(--danger)]/15 text-[var(--danger)]" };
}

export default async function TrainerProgressPage() {
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
        <PageHeader title="Client Progress" subtitle="Finish trainer setup first." />
      </PageShell>
    );
  }

  const { data: rows } = await supabase.rpc("trainer_client_progress", {
    p_tenant_id: tenant.id,
  });
  const progress = (rows ?? []) as Progress[];

  // Names/emails for the clients.
  const ids = progress.map((p) => p.client_user_id);
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, email").in("id", ids)
    : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      (p.full_name as string) || (p.email as string) || "Client",
    ])
  );

  // Sort most-at-risk first (largest days-since-active; never-trained on top).
  const list = [...progress].sort((a, b) => {
    const da = daysSince(a.last_session_at);
    const db = daysSince(b.last_session_at);
    return (db ?? 1e9) - (da ?? 1e9);
  });

  const trainedThisWeek = progress.filter((p) => p.sessions_7d > 0).length;
  const atRisk = progress.filter((p) => {
    const d = daysSince(p.last_session_at);
    return d === null || d > 14;
  }).length;

  return (
    <PageShell>
      <PageHeader
        title="Client Progress"
        subtitle="See who's training, who's stalling, and who needs a nudge."
      />

      {progress.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--text-muted)]">
          No active clients yet. Add clients from the Clients page.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Stat label="Active clients" value={String(progress.length)} />
            <Stat label="Trained this week" value={String(trainedThisWeek)} />
            <Stat label="Need a nudge" value={String(atRisk)} />
          </div>

          <div className="mt-4 space-y-2">
            {list.map((p) => {
              const days = daysSince(p.last_session_at);
              const s = status(days);
              const change = p.weight_change_30d;
              const ChangeIcon =
                change === null || Math.abs(change) < 0.1
                  ? Minus
                  : change < 0
                    ? TrendingDown
                    : TrendingUp;
              return (
                <div
                  key={p.client_user_id}
                  className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{nameById.get(p.client_user_id)}</p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {days === null
                          ? "No sessions logged yet"
                          : days === 0
                            ? "Trained today"
                            : `Last trained ${days} day${days === 1 ? "" : "s"} ago`}
                      </p>
                    </div>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${s.className}`}
                    >
                      {(days === null || days > 14) && <AlertTriangle className="h-3.5 w-3.5" />}
                      {s.label}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--text-secondary)]">
                    <span>{p.sessions_7d} this week</span>
                    <span>{p.sessions_30d} in 30 days</span>
                    <span>{p.total_sessions} total</span>
                    {p.latest_weight != null && (
                      <span className="inline-flex items-center gap-1">
                        {p.latest_weight} kg
                        {change != null && Math.abs(change) >= 0.1 && (
                          <span
                            className={`inline-flex items-center gap-0.5 ${
                              change < 0
                                ? "text-[var(--accent-primary)]"
                                : "text-[var(--text-muted)]"
                            }`}
                          >
                            <ChangeIcon className="h-3 w-3" />
                            {Math.abs(change).toFixed(1)} kg / 30d
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <Link
                      href="/trainer/clients"
                      className="text-xs text-[var(--accent-primary)]"
                    >
                      Manage client →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </PageShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
