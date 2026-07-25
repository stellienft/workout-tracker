/**
 * Membership plans and the feature matrix. Pure — safe to import anywhere.
 *
 * Free keeps the core training experience genuinely useful; Pro unlocks the
 * "power" features. Add a feature key here and gate its page/route with
 * `planAllows`.
 */

export type Plan = "free" | "pro";

export type Feature =
  | "ai_coach"
  | "custom_splits"
  | "nutrition"
  | "health"
  | "advanced_stats";

export const PRO_PRICE_LABEL = "$10/mo";

// Features that require Pro. Anything not listed is available on Free.
export const PRO_FEATURES: Feature[] = [
  "ai_coach",
  "custom_splits",
  "nutrition",
  "health",
  "advanced_stats",
];

export const FEATURE_LABEL: Record<Feature, string> = {
  ai_coach: "AI Coach",
  custom_splits: "Custom Splits",
  nutrition: "Nutrition & Meal Planning",
  health: "Health Tracking",
  advanced_stats: "Advanced Stats",
};

export function planAllows(plan: Plan, feature: Feature): boolean {
  if (plan === "pro") return true;
  return !PRO_FEATURES.includes(feature);
}

// What Pro unlocks, for the billing / upsell UI.
export const PRO_BENEFITS: string[] = [
  "AI Coach — adaptive programming built from your own training",
  "Custom Splits — build and train your own workout splits",
  "Nutrition — meal planning, the full recipe library and macro targets",
  "Health tracking — body metrics, wellness trackers and medications",
  "Advanced stats — per-exercise progression history and estimated 1RM trends",
];

// What Free includes, for the billing UI.
export const FREE_INCLUDES: string[] = [
  "Follow programs and log every workout",
  "Full exercise library with animated demos",
  "Progress graphs, check-ins and goals",
  "Achievements, streaks and shareable cards",
];
