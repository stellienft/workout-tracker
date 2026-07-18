import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewProgramButton } from "@/components/admin/new-program-button";
import type { Program } from "@/lib/types";

export default async function AdminProgramsPage() {
  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("programs")
    .select("*")
    .order("status")
    .order("name");

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Programs</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Draft programs are hidden from users until published.
          </p>
        </div>
        <NewProgramButton />
      </div>

      <div className="mt-6 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-subtle)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-secondary)] text-left text-xs uppercase text-[var(--text-muted)]">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Mode</th>
              <th className="p-3">Weeks</th>
              <th className="hidden p-3 sm:table-cell">Featured</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {(programs as Program[] | null)?.map((p) => (
              <tr key={p.id} className="bg-[var(--surface-primary)]">
                <td className="p-3">
                  <Link
                    href={`/admin/programs/${p.id}`}
                    className="font-medium hover:text-[var(--accent-primary)]"
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="p-3 capitalize text-[var(--text-secondary)]">
                  {p.scheduling_mode.replace("_", " ")}
                </td>
                <td className="p-3 text-[var(--text-secondary)]">{p.duration_weeks}</td>
                <td className="hidden p-3 sm:table-cell">
                  {p.featured ? "★" : "—"}
                </td>
                <td className="p-3">
                  <StatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-[var(--accent-muted)] text-[var(--accent-primary)]",
    draft: "bg-[var(--surface-elevated)] text-[var(--text-secondary)]",
    review: "bg-[var(--surface-elevated)] text-[var(--warning)]",
    archived: "bg-[var(--surface-elevated)] text-[var(--text-muted)]",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs capitalize ${
        map[status] ?? map.draft
      }`}
    >
      {status}
    </span>
  );
}
