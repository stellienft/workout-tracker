"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The recovery link establishes a session (via the auth callback). Confirm
  // it's present so we don't show the form to someone who arrived directly.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setReady(true);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => {
        router.push("/dashboard");
        router.refresh();
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update password");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return <div className="skeleton h-48 w-full" />;

  if (!hasSession) {
    return (
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 text-sm">
        <p className="font-semibold">This reset link has expired</p>
        <p className="mt-1 text-[var(--text-secondary)]">
          Password reset links can only be used once and expire after a short
          time. Request a fresh one to continue.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-[var(--accent-primary)] font-medium"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <p className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5 text-sm text-[var(--accent-primary)]">
        Password updated — taking you to your dashboard…
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          New password
        </span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          className="h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 text-white placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[var(--text-secondary)]">
          Confirm password
        </span>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
          className="h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 text-white placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
        />
      </label>
      {error && (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={loading} className="mt-2">
        {loading ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
