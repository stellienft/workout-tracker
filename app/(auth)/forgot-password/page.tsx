import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Stellio <span className="text-[var(--accent-primary)]">Fit</span>
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Forgot your password? Enter your email and we&apos;ll send you a reset
          link.
        </p>
      </div>
      <Suspense fallback={<div className="skeleton h-48 w-full" />}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}
