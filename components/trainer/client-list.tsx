"use client";

import { useState, useTransition } from "react";
import { Dumbbell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  inviteClient,
  updateClientStatus,
  startThread,
  assignProgramToClient,
  unassignPlan,
} from "@/lib/actions/trainer";
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
interface ProgramOption {
  id: string;
  name: string;
}
interface Assignment {
  id: string;
  clientUserId: string;
  programName: string;
}

export function ClientList({
  clients,
  programs,
  assignments,
}: {
  clients: Client[];
  programs: ProgramOption[];
  assignments: Assignment[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [assignFor, setAssignFor] = useState<string | null>(null);

  function assign(clientUserId: string, programId: string) {
    startTransition(async () => {
      const res = await assignProgramToClient({ programId, clientUserId });
      if (res.ok) {
        toast("Program assigned — your client can train it now.", "success");
        setAssignFor(null);
        router.refresh();
      } else {
        toast(res.error ?? "Could not assign", "error");
      }
    });
  }

  function removeAssignment(id: string) {
    startTransition(async () => {
      const res = await unassignPlan(id);
      if (res.ok) {
        toast("Assignment removed.", "success");
        router.refresh();
      } else {
        toast(res.error ?? "Could not remove", "error");
      }
    });
  }

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
          {clients.map((c) => {
            const clientAssignments = assignments.filter(
              (a) => a.clientUserId === c.user_id
            );
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)]"
              >
                <div className="flex items-center justify-between gap-3 p-4">
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

                {/* Assigned plans */}
                <div className="space-y-2 border-t border-[var(--border-subtle)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Assigned plans
                  </p>
                  {clientAssignments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {clientAssignments.map((a) => (
                        <span
                          key={a.id}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-3 py-1 text-xs"
                        >
                          <Dumbbell className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                          {a.programName}
                          <button
                            onClick={() => removeAssignment(a.id)}
                            disabled={pending}
                            aria-label={`Remove ${a.programName}`}
                            className="text-[var(--text-muted)] hover:text-[var(--danger)]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">
                      No plans assigned yet.
                    </p>
                  )}

                  {c.status === "active" &&
                    (assignFor === c.user_id ? (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {programs.length === 0 ? (
                          <p className="text-xs text-[var(--text-muted)]">
                            Create a program first, then assign it here.
                          </p>
                        ) : (
                          programs.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => assign(c.user_id, p.id)}
                              disabled={pending}
                              className="rounded-lg border border-[var(--border-subtle)] px-3 py-1.5 text-xs hover:border-[var(--border-active)] disabled:opacity-50"
                            >
                              {p.name}
                            </button>
                          ))
                        )}
                        <button
                          onClick={() => setAssignFor(null)}
                          className="rounded-lg px-2 py-1.5 text-xs text-[var(--text-muted)]"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAssignFor(c.user_id)}
                        className="rounded-lg border border-dashed border-[var(--border-subtle)] px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:border-[var(--border-active)] hover:text-[var(--text-primary)]"
                      >
                        + Assign a program
                      </button>
                    ))}
                </div>
              </div>
            );
          })}
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
