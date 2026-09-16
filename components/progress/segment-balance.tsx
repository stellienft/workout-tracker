interface Seg {
  left_arm_mass_kg?: number | null;
  right_arm_mass_kg?: number | null;
  trunk_mass_kg?: number | null;
  left_leg_mass_kg?: number | null;
  right_leg_mass_kg?: number | null;
  [key: string]: unknown;
}

type State = "lead" | "behind" | "neutral";

function fillFor(state: State): string {
  if (state === "behind") return "var(--warning)";
  if (state === "lead") return "var(--accent-primary)";
  return "var(--text-muted)";
}
function opacityFor(state: State): number {
  return state === "neutral" ? 0.25 : 0.55;
}

/** Compare a left/right pair; the smaller side is "behind" if the gap ≥ 3%. */
function pairStates(
  l: number | null | undefined,
  r: number | null | undefined
): { left: State; right: State; note: string | null } {
  if (l == null || r == null || l <= 0 || r <= 0)
    return { left: "neutral", right: "neutral", note: null };
  const diff = Math.abs(l - r) / Math.max(l, r);
  if (diff < 0.03) return { left: "lead", right: "lead", note: null };
  const leftLower = l < r;
  const pct = Math.round(diff * 100);
  return {
    left: leftLower ? "behind" : "lead",
    right: leftLower ? "lead" : "behind",
    note: `${leftLower ? "Left" : "Right"} is ${pct}% behind`,
  };
}

/**
 * A schematic body map from a scan's segmental lean mass. Left/right limbs are
 * shaded by balance — the lower side of a pair is flagged when the gap is
 * meaningful. Renders nothing without at least one usable pair.
 */
export function SegmentBalance({ scan }: { scan: Seg | null }) {
  if (!scan) return null;
  const arms = pairStates(scan.left_arm_mass_kg, scan.right_arm_mass_kg);
  const legs = pairStates(scan.left_leg_mass_kg, scan.right_leg_mass_kg);
  const hasArms = scan.left_arm_mass_kg != null && scan.right_arm_mass_kg != null;
  const hasLegs = scan.left_leg_mass_kg != null && scan.right_leg_mass_kg != null;
  if (!hasArms && !hasLegs) return null;

  const trunkState: State = scan.trunk_mass_kg != null ? "lead" : "neutral";
  const notes = [arms.note, legs.note].filter(Boolean) as string[];
  const num = (v: unknown) => (v == null ? null : Number(v));

  // Note: viewer's-left shows the person's RIGHT side (mirror), so the person's
  // "left" limb is drawn on the right of the figure and vice-versa.
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-subtle)] bg-[var(--surface-primary)] p-5">
      <h3 className="text-lg font-bold">Segmental balance</h3>
      <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
        Left vs right lean mass from your scan.
      </p>

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
        <svg viewBox="0 0 200 300" className="h-56 w-auto" role="img" aria-label="Body balance map">
          {/* head */}
          <circle cx="100" cy="30" r="18" fill="var(--text-muted)" fillOpacity="0.25" />
          {/* trunk */}
          <rect x="76" y="52" width="48" height="86" rx="16"
            fill={fillFor(trunkState)} fillOpacity={opacityFor(trunkState)} />
          {/* person's RIGHT arm (viewer left) */}
          <rect x="48" y="56" width="20" height="80" rx="10"
            fill={fillFor(arms.right)} fillOpacity={opacityFor(arms.right)} />
          {/* person's LEFT arm (viewer right) */}
          <rect x="132" y="56" width="20" height="80" rx="10"
            fill={fillFor(arms.left)} fillOpacity={opacityFor(arms.left)} />
          {/* person's RIGHT leg (viewer left) */}
          <rect x="80" y="144" width="18" height="118" rx="9"
            fill={fillFor(legs.right)} fillOpacity={opacityFor(legs.right)} />
          {/* person's LEFT leg (viewer right) */}
          <rect x="102" y="144" width="18" height="118" rx="9"
            fill={fillFor(legs.left)} fillOpacity={opacityFor(legs.left)} />
        </svg>

        <div className="w-full max-w-[15rem] space-y-2 text-sm">
          {hasArms && (
            <BalRow label="Arms" left={num(scan.left_arm_mass_kg)} right={num(scan.right_arm_mass_kg)} />
          )}
          {scan.trunk_mass_kg != null && (
            <BalRow label="Trunk" single={num(scan.trunk_mass_kg)} />
          )}
          {hasLegs && (
            <BalRow label="Legs" left={num(scan.left_leg_mass_kg)} right={num(scan.right_leg_mass_kg)} />
          )}
        </div>
      </div>

      {notes.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          {notes.map((n) => (
            <p key={n} className="text-xs text-[var(--warning)]">
              ⚠ {n} — add unilateral work on that side.
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function BalRow({
  label,
  left,
  right,
  single,
}: {
  label: string;
  left?: number | null;
  right?: number | null;
  single?: number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-2 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-wide text-[var(--text-muted)]">{label}</span>
      {single != null ? (
        <span className="font-semibold tabular-nums">{single.toFixed(1)} kg</span>
      ) : (
        <span className="tabular-nums">
          <span className="text-[var(--text-secondary)]">L {left?.toFixed(1)}</span>
          <span className="mx-1.5 text-[var(--text-muted)]">·</span>
          <span className="text-[var(--text-secondary)]">R {right?.toFixed(1)}</span>
          <span className="ml-1 text-xs text-[var(--text-muted)]">kg</span>
        </span>
      )}
    </div>
  );
}
