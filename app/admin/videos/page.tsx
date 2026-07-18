import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VideoVerifyButtons } from "@/components/admin/video-verify-buttons";

export default async function AdminVideosPage() {
  const supabase = await createClient();

  const { data: videos } = await supabase
    .from("exercise_videos")
    .select("*, exercise:exercises(name, slug)")
    .order("verification_status")
    .limit(500);

  const placeholders =
    videos?.filter((v) => v.verification_status === "placeholder") ?? [];
  const others = videos?.filter((v) => v.verification_status !== "placeholder") ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold">YouTube videos</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Placeholders need a real, verified link before they count as guidance.
      </p>

      {placeholders.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--warning)]">
            Needs attention ({placeholders.length})
          </h2>
          <div className="mt-3 space-y-2">
            {placeholders.map((v) => {
              const ex = v.exercise as unknown as { name: string; slug: string } | null;
              return (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--warning)]/30 bg-[var(--surface-primary)] p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{ex?.name}</p>
                    <p className="text-xs text-[var(--warning)]">Placeholder link</p>
                  </div>
                  {v.exercise_id && (
                    <Link
                      href={`/admin/exercises/${v.exercise_id}`}
                      className="shrink-0 rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs"
                    >
                      Add real video
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          All videos ({others.length})
        </h2>
        <div className="mt-3 space-y-2">
          {others.map((v) => {
            const ex = v.exercise as unknown as { name: string } | null;
            return (
              <div
                key={v.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{ex?.name}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {v.source_url}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] ${
                      v.verification_status === "verified"
                        ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                        : "bg-[var(--surface-elevated)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {v.verification_status}
                  </span>
                </div>
                <VideoVerifyButtons videoId={v.id} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
