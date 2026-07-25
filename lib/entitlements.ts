import { cache } from "react";
import { getAuthContext, isAdminRole } from "@/lib/auth";
import type { Plan } from "@/lib/plan";

export interface Entitlement {
  plan: Plan;
  isPro: boolean;
  // Why they're Pro: own subscription, a coaching package, a free grant
  // (referral/trial), or a staff role.
  source: "subscription" | "coaching" | "trial" | "staff" | "free";
  currentPeriodEnd: string | null;
}

/**
 * The current user's plan. Admins always get full access. Trainers must hold an
 * active Trainer subscription ($15/mo) — they are not auto-Pro. Members resolve
 * to their subscription (or an active coaching package), defaulting to Free.
 */
export const getUserPlan = cache(async (): Promise<Entitlement> => {
  const { user, roles, supabase } = await getAuthContext();
  if (!user) return { plan: "free", isPro: false, source: "free", currentPeriodEnd: null };

  if (isAdminRole(roles)) {
    return { plan: "pro", isPro: true, source: "staff", currentPeriodEnd: null };
  }

  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", user.id)
    .maybeSingle();

  const active = data?.plan === "pro" && (data?.status === "active" || data?.status === "trialing");
  if (active) {
    return {
      plan: "pro",
      isPro: true,
      source: "subscription",
      currentPeriodEnd: (data?.current_period_end as string | null) ?? null,
    };
  }

  // An active coaching package from a trainer also unlocks Pro.
  const { data: pkg } = await supabase
    .from("trainer_client_packages")
    .select("id")
    .eq("client_user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (pkg) {
    return { plan: "pro", isPro: true, source: "coaching", currentPeriodEnd: null };
  }

  // A free grant (referral bonus / trial) that hasn't expired.
  const { data: grant } = await supabase
    .from("free_grants")
    .select("pro_until")
    .eq("user_id", user.id)
    .maybeSingle();
  if (grant?.pro_until && new Date(grant.pro_until as string).getTime() > Date.now()) {
    return {
      plan: "pro",
      isPro: true,
      source: "trial",
      currentPeriodEnd: grant.pro_until as string,
    };
  }

  return { plan: "free", isPro: false, source: "free", currentPeriodEnd: null };
});
