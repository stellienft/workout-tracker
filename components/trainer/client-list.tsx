"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { inviteClient, updateClientStatus, startThread } from "@/lib/actions/trainer";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  user_id: string;
  display_name: string | null;
  status: string;
  subscription_active: boolean;
  assigned_at: string;
  profiles: { email: string; full_name: string | null } | null;
}

export function ClientList({ clients }: { clients: Client[] }) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  function invite() {
    startTransition(async () => {
      const res = await inviteClient({ email, displayName });
      if (res.ok) {
        toast("Client added.", "success");
        setEmail("");
        setDisplayName("");
        setShowForm(false);
      } else {
        toast(res.error ?? "Could not add client", "error");
      }
    });
  }

  function changeStatus(id: string, status: "active" | "paused" | "removed") {
    startTransition(async () => {
      const res = await updateClientStatus(id, status);
      if (res.ok) toast(`Client ${status}.`, "success");
      else toast(res.error ?? "Error", "error");
    });
  }

  function message(userId: string) {
    startTransition(async () => {
      const res = await startThread(userId);
      if (res.ok && res.threadId) {
        router.push(`/trainer/chat?thread=${res.threadId}`);
      }
    });
  }

  return (
    <div className="space-y-3">
      {clients.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] p-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">
            No clients yet. Add your first client below.
          </p>
        </div>
      )}

      {clients.length > 0 && (
        <div className="space-y-2">
          {clients.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-muted)] text-sm font-bold text-[var(--accent-primary)]">
                  {(c.display_name || c.profiles?.full_name || c.profiles?.email || "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {c.display_name || c.profiles?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {c.profiles?.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    c.status === "active"
                      ? "bg-[var(--accent-muted)] text-[var(--accent-primary)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {c.status}
                </span>
                <button
                  onClick={() => message(c.user_id)}
                  disabled={pending}
                  className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-white"
                >
                  Message
                </button>
                {c.status === "active" && (
                  <button
                    onClick={() => changeStatus(c.id, "paused")}
                    disabled={pending}
                    className="rounded-lg px-2 py-1.5 text-xs text-[var(--text-muted)]"
                  >
                    Pause
                  </button>
                )}
                {c.status === "paused" && (
                  <button
                    onClick={() => changeStatus(c.id, "active")}
                    disabled={pending}
                    className="rounded-lg px-2 py-1.5 text-xs text-[var(--accent-primary)]"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="space-y-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Add a client by their email. They must already have a Stellio Fit account.
          </p>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@email.com"
            type="email"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name (optional)"
            className="h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 text-sm focus:border-[var(--border-active)] focus:outline-none"
          />
          <div className="flex gap-2">
            <Button onClick={invite} disabled={pending || !email} size="lg" className="flex-1">
              {pending ? "Adding…" : "Add client"}
            </Button>
            <Button onClick={() => setShowForm(false)} variant="secondary" size="lg">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-2xl border border-dashed border-[var(--border-subtle)] py-4 text-sm text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-white"
        >
          + Add a client
        </button>
      )}
    </div>
  );
}
