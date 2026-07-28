import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTrainer, getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { serviceSupabase } from "@/lib/push";
import { PageShell } from "@/components/ui/page-header";
import { WeightProgress } from "@/components/progress/weight-progress";
import { SessionScheduler, type SessionRow } from "@/components/trainer/session-scheduler";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Client" };

interface MetricRow {
  recorded_on: string;
  weight_kg: number | null;
  waist_cm: number | null;
}
interface PhotoRow {
  id: string;
  storage_path: string;
  pose: string;
  taken_on: string;
  weight_kg: number | null;
  note: string | null;
}

export default async function TrainerClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  await requireTrainer();
  const { clientId } = await params;
  const { user } = await getAuthContext();
  const supabase = await createClient();

  // Authorise: this client must be an active client of a tenant we own.
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_user_id", user!.id)
    .maybeSingle();
  if (!tenant) notFound();

  const { data: rel } = await supabase
    .from("trainer_clients")
    .select("id, display_name")
    .eq("tenant_id", tenant.id)
    .eq("user_id", clientId)
    .maybeSingle();
  if (!rel) notFound();

  const [{ data: profile }, { data: metrics }, { data: photoRows }, { data: sessionRows }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, email, timezone").eq("id", clientId).maybeSingle(),
      supabase.rpc("trainer_client_metrics", { p_client_user_id: clientId }),
      supabase.rpc("trainer_client_photos", { p_client_user_id: clientId }),
      supabase
        .from("coaching_sessions")
        .select("id, scheduled_at, duration_min, type, location, notes, status")
        .eq("tenant_id", tenant.id)
        .eq("client_user_id", clientId)
        .eq("status", "scheduled")
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true }),
    ]);

  const name =
    (rel.display_name as string) ||
    (profile?.full_name as string) ||
    (profile?.email as string) ||
    "Client";
  const tz = (profile?.timezone as string) || "Australia/Brisbane";

  const weightData = ((metrics ?? []) as MetricRow[])
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ x: m.recorded_on, y: Number(m.weight_kg) }));

  // Sign the client's private photos with the service role (authorised above).
  const rows = (photoRows ?? []) as PhotoRow[];
  const photos: { id: string; url: string; pose: string; takenOn: string; weightKg: number | null }[] = [];
  if (rows.length > 0) {
    const svc = serviceSupabase();
    const { data: signed } = await svc.storage
      .from("progress-photos")
      .createSignedUrls(rows.map((p) => p.storage_path), 60 * 60);
    const urlByPath = new Map(
      (signed ?? []).filter((s) => s.signedUrl && s.path).map((s) => [s.path as string, s.signedUrl])
    );
    for (const p of rows) {
      const url = urlByPath.get(p.storage_path);
      if (url) {
        photos.push({
          id: p.id,
          url,
          pose: p.pose,
          takenOn: p.taken_on,
          weightKg: p.weight_kg != null ? Number(p.weight_kg) : null,
        });
      }
    }
  }

  return (
    <PageShell>
      <Link
        href="/trainer/progress"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Client progress
      </Link>
      <h1 className="mt-3 text-2xl font-bold">{name}</h1>
      <p className="text-sm text-[var(--text-muted)]">{profile?.email as string}</p>

      <div className="mt-6">
        <SessionScheduler
          clientUserId={clientId}
          upcoming={(sessionRows ?? []) as SessionRow[]}
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-bold">Weight</h2>
        {weightData.length > 0 ? (
          <WeightProgress data={weightData} tz={tz} />
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            No weight entries logged yet.
          </p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Progress photos</h2>
        {photos.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No progress photos shared yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={`${p.pose} progress`}
                  className="aspect-[3/4] w-full object-cover"
                />
                <div className="p-2 text-xs text-[var(--text-muted)]">
                  <span className="capitalize">{p.pose}</span> ·{" "}
                  {new Date(p.takenOn).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                  {p.weightKg != null ? ` · ${p.weightKg} kg` : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
