import { cache } from "react";
import { getAuthContext, isAdminRole, isTrainerRole } from "@/lib/auth";
import type { Plan } from "@/lib/plan";

export interface Entitlement {
  plan: Plan;
  isPro: boolean;
  // Why they're Pro: their own subscription, or a staff role (admin/trainer).
  source: "subscription" | "staff" | "free";
  currentPeriodEnd: string | null;
}

/**
 * The current user's plan. Admins and trainers always get Pro (they need the
 * full toolset to run the platform / their clients). Everyone else resolves to
 * their subscription row, defaulting to Free.
 */
export const getUserPlan = cache(async (): Promise<Entitlement> => {
  const { user, roles, supabase } = await getAuthContext();
  if (!user) return { plan: "free", isPro: false, source: "free", currentPeriodEnd: null };

  if (isAdminRole(roles) || isTrainerRole(roles)) {
    return { plan: "pro", isPro: true, source: "staff", currentPeriodEnd: null };
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const active = data?.plan === "pro" && (data?.status === "active" || data?.status === "trialing");
  return {
    plan: active ? "pro" : "free",
    isPro: !!active,
    source: active ? "subscription" : "free",
    currentPeriodEnd: (data?.current_period_end as string | null) ?? null,
  };
});
