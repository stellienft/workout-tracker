"use client";

/**
 * Compact "superset group" picker used in the program/split editors. Adjacent
 * exercises given the same letter are performed as a superset/circuit in the
 * workout runner. Value maps A→1, B→2, … ; empty clears the group.
 */
export function SupersetSelect({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (group: number | null) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      disabled={disabled}
      aria-label="Superset group"
      title="Group with adjacent exercises into a superset/circuit"
      className="h-8 shrink-0 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-secondary)] px-2 text-xs focus:border-[var(--border-active)] focus:outline-none disabled:opacity-50"
    >
      <option value="">No superset</option>
      {[1, 2, 3, 4].map((g) => (
        <option key={g} value={g}>
          Superset {String.fromCharCode(64 + g)}
        </option>
      ))}
    </select>
  );
}
