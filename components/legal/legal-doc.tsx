import type { ReactNode } from "react";

export function LegalTitle({
  title,
  updated,
}: {
  title: string;
  updated: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">Last updated {updated}</p>
    </div>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mb-8 text-base leading-relaxed text-[var(--text-secondary)]">
      {children}
    </p>
  );
}

export function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-bold">
        <span className="text-[var(--text-muted)]">{n}.</span> {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
        {children}
      </div>
    </section>
  );
}

export function List({ children }: { children: ReactNode }) {
  return (
    <ul className="ml-1 space-y-2">
      {children}
    </ul>
  );
}

export function Item({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-primary)]" />
      <span>{children}</span>
    </li>
  );
}
