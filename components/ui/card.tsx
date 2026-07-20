import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "bg-[var(--surface-primary)] border border-[var(--border-subtle)] rounded-[var(--radius-card)]",
        className
      )}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-2 text-2xl font-bold",
          accent ? "text-[var(--accent-primary)]" : "text-[var(--text-primary)]"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-[var(--text-secondary)]">{sub}</p>}
    </Card>
  );
}
