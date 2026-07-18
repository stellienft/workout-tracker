import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-[var(--background-primary)] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--surface-secondary)]">
        <WifiOff className="h-8 w-8 text-[var(--text-secondary)]" />
      </div>
      <h1 className="mt-6 text-2xl font-bold">You&apos;re offline</h1>
      <p className="mt-2 max-w-sm text-[var(--text-secondary)]">
        Stellio Fit needs a connection for this page. Any sets you logged during
        your workout are saved on this device and will sync automatically when
        you&apos;re back online.
      </p>
      <a
        href="/dashboard"
        className="mt-6 rounded-2xl bg-[var(--accent-primary)] px-5 py-3 font-semibold text-black"
      >
        Try again
      </a>
    </main>
  );
}
