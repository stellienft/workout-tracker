import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle } from "lucide-react";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: users },
    { count: programs },
    { count: draftPrograms },
    { count: exercises },
    { count: placeholderVideos },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("programs").select("id", { count: "exact", head: true }),
    supabase
      .from("programs")
      .select("id", { count: "exact", head: true })
      .neq("status", "published"),
    supabase.from("exercises").select("id", { count: "exact", head: true }),
    supabase
      .from("exercise_videos")
      .select("id", { count: "exact", head: true })
      .eq("verification_status", "placeholder"),
  ]);

  const stats = [
    { label: "Users", value: users ?? 0, href: "/admin/users" },
    { label: "Programs", value: programs ?? 0, href: "/admin/programs" },
    { label: "Draft programs", value: draftPrograms ?? 0, href: "/admin/programs" },
    { label: "Exercises", value: exercises ?? 0, href: "/admin/exercises" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">
        Manage content, media and roles for Stellio Fit.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
          >
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-[var(--text-muted)]">{s.label}</p>
          </Link>
        ))}
      </div>

      {(placeholderVideos ?? 0) > 0 && (
        <Link
          href="/admin/videos"
          className="mt-4 flex items-center gap-3 rounded-[var(--radius-card)] border border-[var(--warning)]/40 bg-[var(--surface-primary)] p-4"
        >
          <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
          <div>
            <p className="font-medium">
              {placeholderVideos} exercise{placeholderVideos === 1 ? "" : "s"} still
              use a placeholder video
            </p>
            <p className="text-sm text-[var(--text-secondary)]">
              Replace placeholders with verified YouTube links before presenting them
              as guidance.
            </p>
          </div>
        </Link>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <QuickLink href="/admin/programs" title="Programs" desc="Create, edit, publish and feature training programs." />
        <QuickLink href="/admin/recipes" title="Recipes" desc="Import real recipes with photos + macros from Spoonacular." />
        <QuickLink href="/admin/videos" title="YouTube videos" desc="Add and verify exercise video links." />
        <QuickLink href="/admin/media" title="Media" desc="Review cover-image placeholders and publish uploads." />
        <QuickLink href="/admin/featured-content" title="Featured" desc="Curate dashboard hero and discovery cards." />
      </div>
    </div>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4 hover:border-[var(--border-active)]"
    >
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-[var(--text-secondary)]">{desc}</p>
    </Link>
  );
}
