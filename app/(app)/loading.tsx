import { PageShell } from "@/components/ui/page-header";

// Shown instantly on navigation while the server renders the page,
// so transitions feel immediate rather than frozen.
export default function Loading() {
  return (
    <PageShell>
      <div className="pt-safe">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton mt-2 h-4 w-72" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="skeleton h-72 rounded-[var(--radius-card)] lg:col-span-2" />
        <div className="skeleton h-72 rounded-[var(--radius-card)]" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-[var(--radius-card)]" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-56 rounded-[var(--radius-card)]" />
        ))}
      </div>
    </PageShell>
  );
}
