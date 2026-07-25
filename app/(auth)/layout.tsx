import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col bg-[var(--background-primary)] bg-[radial-gradient(ellipse_at_top,rgba(204,255,48,0.08),transparent_60%)]">
      <div className="flex-1">{children}</div>
      <footer className="px-6 py-6">
        <nav className="mx-auto flex max-w-md items-center justify-center gap-4 text-xs text-[var(--text-muted)]">
          <Link href="/legal/privacy" className="hover:text-[var(--text-primary)]">
            Privacy Policy
          </Link>
          <span aria-hidden>·</span>
          <Link href="/legal/terms" className="hover:text-[var(--text-primary)]">
            Terms of Service
          </Link>
        </nav>
      </footer>
    </main>
  );
}
