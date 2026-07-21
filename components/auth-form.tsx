"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [accountType, setAccountType] = useState<"user" | "trainer">("user");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              account_type: accountType,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/onboarding");
          router.refresh();
        } else {
          setNotice(
            "Check your email to confirm your account, then sign in."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        const next = params.get("next") || "/dashboard";
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError(null);
    setOauthLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${
      mode === "signup" ? "/onboarding" : "/dashboard"
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: mode === "signup" ? { "account_type": accountType } : {},
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Google OAuth */}
      <button
        onClick={signInWithGoogle}
        disabled={oauthLoading}
        className="flex h-12 items-center justify-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] text-sm font-medium text-white transition-colors hover:border-[var(--border-active)] disabled:opacity-50"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {oauthLoading ? "Connecting…" : mode === "signup" ? "Sign up with Google" : "Continue with Google"}
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
        <span className="text-xs text-[var(--text-muted)]">or</span>
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>

      {/* Account type selector (signup only) */}
      {mode === "signup" && (
        <div>
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            I am a…
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAccountType("user")}
              className={`rounded-xl border p-3 text-left transition-colors ${
                accountType === "user"
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                  : "border-[var(--border-subtle)]"
              }`}
            >
              <span className="block text-sm font-medium">User</span>
              <span className="block text-xs text-[var(--text-muted)]">
                Train & track
              </span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType("trainer")}
              className={`rounded-xl border p-3 text-left transition-colors ${
                accountType === "trainer"
                  ? "border-[var(--border-active)] bg-[var(--accent-muted)]"
                  : "border-[var(--border-subtle)]"
              }`}
            >
              <span className="block text-sm font-medium">Personal Trainer</span>
              <span className="block text-xs text-[var(--text-muted)]">
                Coach & charge
              </span>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <Field
            label="Full name"
            type="text"
            value={fullName}
            onChange={setFullName}
            placeholder="Alex Rivera"
            autoComplete="name"
          />
        )}
        <Field
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
        />
        {error && (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="text-sm text-[var(--accent-primary)]">{notice}</p>
        )}
        <Button type="submit" size="lg" disabled={loading} className="mt-2">
          {loading
            ? "Please wait…"
            : mode === "signup"
              ? "Create account"
              : "Sign in"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-[var(--text-secondary)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="h-12 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-primary)] px-4 text-white placeholder:text-[var(--text-muted)] focus:border-[var(--border-active)] focus:outline-none"
      />
    </label>
  );
}
