export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-dvh bg-[var(--background-primary)] bg-[radial-gradient(ellipse_at_top,rgba(204,255,48,0.08),transparent_60%)]">
      {children}
    </main>
  );
}
