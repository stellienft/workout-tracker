import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Stellio <span className="text-[var(--accent-primary)]">Fit</span>
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Train Smarter. Build Stronger.
        </p>
      </div>
      <Suspense fallback={<div className="skeleton h-64 w-full" />}>
        <AuthForm mode="login" />
      </Suspense>
      <p className="mt-4 text-center text-sm">
        <Link
          href="/forgot-password"
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          Forgot your password?
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
        New here?{" "}
        <Link href="/signup" className="text-[var(--accent-primary)] font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}
