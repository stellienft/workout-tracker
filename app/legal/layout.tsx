import Link from "next/link";
import { BackButton } from "@/components/legal/back-button";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[var(--background-primary)] text-[var(--text-primary)]">
      <header className="border-b border-[var(--border-subtle)]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="text-lg font-extrabold tracking-tight">
            Stellio<span className="text-[var(--accent-primary)]">Fit</span>
          </Link>
          <BackButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
      <footer className="border-t border-[var(--border-subtle)]">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-[var(--text-muted)] sm:px-6">
          <span>© {new Date().getFullYear()} Stellio Fit</span>
          <nav className="flex gap-4">
            <Link href="/legal/privacy" className="hover:text-[var(--text-primary)]">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-[var(--text-primary)]">
              Terms
            </Link>
            <a
              href="mailto:hello@stellio.com.au"
              className="hover:text-[var(--text-primary)]"
            >
              Contact
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
