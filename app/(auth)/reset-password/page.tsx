import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata = { title: "Set a new password" };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Ares Fitness" className="h-11 w-auto" />
        </h1>
        <p className="mt-2 text-[var(--text-secondary)]">
          Choose a new password for your account.
        </p>
      </div>
      <Suspense fallback={<div className="skeleton h-48 w-full" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
