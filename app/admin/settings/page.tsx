import { createClient } from "@/lib/supabase/server";

interface Setting {
  key: string;
  value: unknown;
  updated_at: string;
}

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("*")
    .order("key");

  return (
    <div>
      <h1 className="text-2xl font-bold">Application settings</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        System-wide configuration. Stored as key/value JSON.
      </p>

      <div className="mt-6 space-y-3">
        {(settings as Setting[] | null)?.map((s) => (
          <div
            key={s.key}
            className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
          >
            <p className="font-mono text-sm font-semibold text-[var(--accent-primary)]">
              {s.key}
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-[var(--surface-secondary)] p-3 text-xs text-[var(--text-secondary)]">
              {JSON.stringify(s.value, null, 2)}
            </pre>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Updated {new Date(s.updated_at).toLocaleString()}
            </p>
          </div>
        ))}
        {(!settings || settings.length === 0) && (
          <p className="text-sm text-[var(--text-muted)]">No settings configured.</p>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
        <p className="text-sm font-semibold">Reserved super administrator</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          <code className="text-[var(--accent-primary)]">hello@stellio.com.au</code> is
          automatically granted the super administrator role on first sign-in via a
          trusted server-side database trigger. This cannot be changed from the client.
        </p>
      </div>
    </div>
  );
}
