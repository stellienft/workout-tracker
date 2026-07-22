import Link from "next/link";
import { PlayCircle, Youtube } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { CoverImage } from "@/components/ui/cover-image";

export const metadata = { title: "My Coach" };

export default async function MyCoachPage() {
  const { user } = await requireUser();
  const supabase = await createClient();

  // The tenant(s) this member is an active client of.
  const { data: clientRows } = await supabase
    .from("trainer_clients")
    .select("tenant_id, tenants(name, tagline, logo_url, accent_color, slug)")
    .eq("user_id", user.id)
    .eq("status", "active");

  const first = (clientRows ?? [])[0];
  const tenant = first
    ? Array.isArray(first.tenants)
      ? first.tenants[0]
      : first.tenants
    : null;

  if (!first || !tenant) {
    return (
      <PageShell>
        <PageHeader title="My Coach" subtitle="Your personal trainer's space." />
        <div className="mt-6 rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] p-10 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            You&apos;re not connected to a coach yet. When a trainer adds you as a
            client, their plans and videos will appear here.
          </p>
        </div>
      </PageShell>
    );
  }

  const accent = (tenant.accent_color as string) || "#ccff30";
  const tenantId = first.tenant_id as string;

  const [{ data: splits }, { data: videos }, { data: assignments }] =
    await Promise.all([
      supabase
        .from("custom_splits")
        .select("id, name, description, custom_split_days(id)")
        .eq("owner_user_id", user.id)
        .eq("source", "coach")
        .order("created_at", { ascending: false }),
      supabase
        .from("trainer_videos")
        .select("id, title, source_url, embed_url, thumbnail_url, provider")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("trainer_assignments")
        .select("custom_split_id, trainer_programs(cover_image_path)")
        .eq("client_user_id", user.id),
    ]);

  // Map each assigned split to its source program's cover image.
  const coverBySplit = new Map<string, string | null>();
  for (const a of assignments ?? []) {
    const prog = Array.isArray(a.trainer_programs)
      ? a.trainer_programs[0]
      : a.trainer_programs;
    if (a.custom_split_id) {
      coverBySplit.set(
        a.custom_split_id as string,
        (prog?.cover_image_path as string) ?? null
      );
    }
  }

  const plans = (splits ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
    description: s.description as string | null,
    dayCount: Array.isArray(s.custom_split_days)
      ? s.custom_split_days.length
      : 0,
    cover: coverBySplit.get(s.id as string) ?? null,
  }));

  return (
    // Scope the coach's accent to this page so their brand colour drives the
    // highlights here without changing the member's own app theme.
    <div style={{ ["--accent-primary" as string]: accent } as React.CSSProperties}>
      <PageShell>
        {/* Branded header */}
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-active)] bg-[var(--accent-muted)] p-6">
          <div className="flex items-center gap-4">
            {tenant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={tenant.logo_url as string}
                alt={tenant.name as string}
                className="h-14 w-14 rounded-2xl bg-[var(--surface-primary)] object-contain"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-primary)] text-xl font-bold text-[var(--accent-primary)]">
                {(tenant.name as string).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent-primary)]">
                Your coach
              </p>
              <h1 className="truncate text-2xl font-bold">{tenant.name}</h1>
              {tenant.tagline && (
                <p className="truncate text-sm text-[var(--text-secondary)]">
                  {tenant.tagline as string}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Assigned plans */}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">Your plans</h2>
          {plans.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] p-8 text-center text-sm text-[var(--text-muted)]">
              No plans assigned yet — your coach will add them here.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {plans.map((p) => (
                <Link
                  key={p.id}
                  href={`/splits/${p.id}`}
                  className="group overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
                >
                  <div className="relative h-32 w-full">
                    <CoverImage
                      path={p.cover}
                      alt={p.name}
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                    {tenant.logo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={tenant.logo_url as string}
                        alt=""
                        className="absolute bottom-2 right-2 h-9 w-9 rounded-lg bg-black/45 object-contain p-1 backdrop-blur-sm"
                      />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold">{p.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                      {p.dayCount} {p.dayCount === 1 ? "day" : "days"}
                      {p.description ? ` · ${p.description}` : ""}
                    </p>
                    <span className="mt-3 inline-block rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-black">
                      Start training
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Coach videos */}
        {videos && videos.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-lg font-bold">Coaching videos</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((v) => {
                const href =
                  (v.provider === "upload"
                    ? (v.source_url as string | null)
                    : (v.embed_url as string | null) ||
                      (v.source_url as string | null)) || null;
                return (
                  <a
                    key={v.id as string}
                    href={href ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
                  >
                    <div className="relative flex aspect-video items-center justify-center bg-[var(--surface-secondary)]">
                      {v.thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={v.thumbnail_url as string}
                          alt={v.title as string}
                          className="h-full w-full object-cover"
                        />
                      ) : v.provider === "upload" ? (
                        <PlayCircle className="h-8 w-8 text-[var(--text-muted)]" />
                      ) : (
                        <Youtube className="h-8 w-8 text-[var(--text-muted)]" />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium">{v.title}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}
      </PageShell>
    </div>
  );
}
