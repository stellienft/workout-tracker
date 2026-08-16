import type { Glp1Data } from "@/components/health/glp1-insights";

/** Injection sites offered in the dose form (keep in sync with MedicationForm). */
export const GLP1_SITES = [
  "Left abdomen",
  "Right abdomen",
  "Left thigh",
  "Right thigh",
  "Left arm",
  "Right arm",
];

// GLP-1 / GIP medications we recognise for weekly-dose insights.
const GLP1_RE =
  /mounjaro|tirzepatide|zepbound|ozempic|wegovy|semaglutide|trulicity|dulaglutide|saxenda|rybelsus|liraglutide|victoza/i;

export function isGlp1(name: string | null | undefined): boolean {
  return !!name && GLP1_RE.test(name);
}

/**
 * Recommend the next injection site: the one used least recently. `recentSites`
 * is most-recent-first. A site not used recently (or never) is preferred, so
 * the body has time to recover between injections in the same spot.
 */
export function nextInjectionSite(recentSites: string[]): string {
  let best = GLP1_SITES[0];
  let bestAge = -1;
  for (const site of GLP1_SITES) {
    const idx = recentSites.indexOf(site);
    const age = idx === -1 ? Number.POSITIVE_INFINITY : idx;
    if (age > bestAge) {
      bestAge = age;
      best = site;
    }
  }
  return best;
}

/** Was this site used within the last `within` injections? */
export function siteRecentlyUsed(
  site: string,
  recentSites: string[],
  within = 2
): boolean {
  const idx = recentSites.indexOf(site);
  return idx !== -1 && idx < within;
}

interface RawDose {
  medication_name: string | null;
  dose_mg: number | string | null;
  taken_on: string;
  side_effects: string[] | null;
  side_effect_severity: number | null;
}

const DAY = 86_400_000;

function localDate(iso: string | Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/**
 * Build the GLP-1 companion dataset from raw dose logs and weight metrics.
 * Returns null when the member isn't logging a recognised GLP-1 medication, so
 * the section only appears for people it's relevant to.
 */
export function buildGlp1Data(
  medLogs: RawDose[],
  weights: { recorded_on: string; weight_kg: number | null }[],
  tz: string,
  now: Date = new Date()
): Glp1Data | null {
  const glp1Logs = medLogs.filter((l) => isGlp1(l.medication_name));
  if (glp1Logs.length === 0) return null;

  // Chronological (oldest → newest).
  const chron = [...glp1Logs].sort((a, b) => a.taken_on.localeCompare(b.taken_on));
  const latest = chron[chron.length - 1];
  const medicationName = latest.medication_name;
  const currentDoseMg =
    latest.dose_mg != null && latest.dose_mg !== "" ? Number(latest.dose_mg) : null;

  // Next dose: GLP-1 injectables here are weekly.
  const lastTaken = new Date(`${latest.taken_on}T12:00:00`);
  const nextDate = new Date(lastTaken.getTime() + 7 * DAY);
  const todayYmd = localDate(now, tz);
  const nextYmd = localDate(nextDate, tz);
  const daysUntil = Math.round(
    (Date.parse(`${nextYmd}T00:00:00Z`) - Date.parse(`${todayYmd}T00:00:00Z`)) / DAY
  );
  const nextDose = {
    dateLabel: nextDate.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
    daysUntil,
  };

  // Dose escalation series (one point per date, latest dose that day).
  const doseByDate = new Map<string, number>();
  for (const l of chron) {
    if (l.dose_mg == null || l.dose_mg === "") continue;
    doseByDate.set(l.taken_on, Number(l.dose_mg));
  }
  const doseSeries = Array.from(doseByDate.entries()).map(([x, y]) => ({ x, y }));

  // Weight series + journey.
  const wPoints = weights
    .filter((w) => w.weight_kg != null)
    .map((w) => ({ x: w.recorded_on, y: Number(w.weight_kg) }));
  let journey: Glp1Data["journey"] = null;
  if (wPoints.length >= 2) {
    const startKg = wPoints[0].y;
    const currentKg = wPoints[wPoints.length - 1].y;
    const lostKg = startKg - currentKg;
    const spanDays =
      (new Date(wPoints[wPoints.length - 1].x).getTime() -
        new Date(wPoints[0].x).getTime()) /
      DAY;
    const weeks = spanDays / 7;
    journey = {
      startKg,
      currentKg,
      lostKg,
      pct: startKg > 0 ? (lostKg / startKg) * 100 : 0,
      weeks,
      perWeekKg: weeks >= 1 ? lostKg / weeks : null,
    };
  }

  // Side effects.
  const doseCount = chron.length;
  const withEffects = chron.filter((l) => (l.side_effects?.length ?? 0) > 0).length;
  const tally = new Map<string, number>();
  for (const l of chron) {
    for (const e of l.side_effects ?? []) tally.set(e, (tally.get(e) ?? 0) + 1);
  }
  const topEffects = Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }));

  // Severity trend: compare the average of the earlier half vs the later half.
  const sev = chron
    .filter((l) => l.side_effect_severity != null)
    .map((l) => l.side_effect_severity as number);
  let severityTrend: "down" | "up" | "flat" | null = null;
  if (sev.length >= 4) {
    const mid = Math.floor(sev.length / 2);
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const early = mean(sev.slice(0, mid));
    const late = mean(sev.slice(mid));
    severityTrend = late < early - 0.5 ? "down" : late > early + 0.5 ? "up" : "flat";
  }

  return {
    medicationName,
    currentDoseMg,
    nextDose,
    doseSeries,
    weightSeries: wPoints,
    journey,
    sideEffects: { doseCount, withEffects, topEffects, severityTrend },
  };
}
