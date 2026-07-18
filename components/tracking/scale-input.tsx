"use client";

export function ScaleInput({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
  hint,
  danger,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  hint?: string;
  danger?: boolean;
}) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="text-xs text-[var(--text-muted)]">{hint}</span>}
      </div>
      <div className="mt-2 flex gap-1.5">
        {steps.map((s) => {
          const active = value === s;
          return (
            <button
              key={s}
              onClick={() => onChange(s)}
              className={`h-10 flex-1 rounded-xl border text-sm font-medium transition-colors ${
                active
                  ? danger
                    ? "border-[var(--danger)] bg-[var(--danger)] text-white"
                    : "border-[var(--border-active)] bg-[var(--accent-primary)] text-black"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
    </div>
  );
}
