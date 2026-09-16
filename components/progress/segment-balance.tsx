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
  return state === "neutral" ? 0.22 : 0.9;
}

// A tapered "muscle" capsule: rounded top (width w0) tapering to a rounded
// bottom (width w1), optionally leaning from (x0,y0) to (x1,y1).
function limb(x0: number, y0: number, w0: number, x1: number, y1: number, w1: number) {
  const r0 = w0 / 2;
  const r1 = w1 / 2;
  return `M ${x0 - r0} ${y0} A ${r0} ${r0} 0 0 1 ${x0 + r0} ${y0} L ${x1 + r1} ${y1} A ${r1} ${r1} 0 0 1 ${x1 - r1} ${y1} Z`;
}

// V-taper torso: broad shoulders → narrow waist → hips.
const TRUNK =
  "M 74 102 C 74 89 93 84 108 84 L 132 84 C 147 84 166 89 166 102 " +
  "C 164 132 156 152 150 178 C 156 191 160 199 158 209 " +
  "C 150 215 90 215 82 209 C 80 199 84 191 90 178 " +
  "C 84 152 76 132 74 102 Z";

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
        <svg viewBox="0 0 240 430" className="h-64 w-auto" role="img" aria-label="Body balance map">
          {/* base body (neutral): head, neck, feet */}
          <circle cx="120" cy="44" r="26" fill="var(--text-muted)" fillOpacity="0.22" />
          <path d={limb(120, 62, 26, 120, 90, 32)} fill="var(--text-muted)" fillOpacity="0.22" />
          <ellipse cx="99" cy="418" rx="14" ry="7" fill="var(--text-muted)" fillOpacity="0.22" />
          <ellipse cx="141" cy="418" rx="14" ry="7" fill="var(--text-muted)" fillOpacity="0.22" />

          {/* trunk */}
          <path d={TRUNK} fill={fillFor(trunkState)} fillOpacity={opacityFor(trunkState)} />

          {/* arms — viewer-left is the person's RIGHT side, and vice-versa */}
          <path d={limb(66, 104, 30, 56, 214, 16)} fill={fillFor(arms.right)} fillOpacity={opacityFor(arms.right)} />
          <path d={limb(174, 104, 30, 184, 214, 16)} fill={fillFor(arms.left)} fillOpacity={opacityFor(arms.left)} />

          {/* legs */}
          <path d={limb(102, 210, 38, 100, 408, 21)} fill={fillFor(legs.right)} fillOpacity={opacityFor(legs.right)} />
          <path d={limb(138, 210, 38, 140, 408, 21)} fill={fillFor(legs.left)} fillOpacity={opacityFor(legs.left)} />
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
