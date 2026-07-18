import Link from "next/link";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Stellio <span className="text-[var(--accent-primary)]">Fit</span>
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Create your account and pick a goal.
        </p>
      </div>
      <Suspense fallback={<div className="skeleton h-80 w-full" />}>
        <AuthForm mode="signup" />
      </Suspense>
      <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent-primary)] font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
