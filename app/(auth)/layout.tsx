import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-[var(--background-primary)] bg-[radial-gradient(ellipse_at_top,rgba(255,82,14,0.12),transparent_60%)]">
      {/* Ares brand watermark behind the auth content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mascot.png"
          alt=""
          className="w-[min(560px,88vw)] max-w-none select-none opacity-[0.06] blur-[1px]"
        />
      </div>
      <div className="relative z-10 flex-1">{children}</div>
      <footer className="relative z-10 px-6 py-6">
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
