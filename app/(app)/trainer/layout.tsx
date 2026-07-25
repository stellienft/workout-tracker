import { redirect } from "next/navigation";
import { getAuthContext, isTrainerRole, isAdminRole } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { TrainerPaywall } from "@/components/billing/trainer-paywall";

/**
 * Gate every trainer tool behind the Trainer plan. Non-trainers are sent home;
 * trainers without an active subscription hit the paywall. Admins pass through.
 */
export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { roles } = await getAuthContext();
  if (!isTrainerRole(roles) && !isAdminRole(roles)) redirect("/dashboard");

  const { isPro } = await getUserPlan();
  if (!isPro) return <TrainerPaywall />;

  return <>{children}</>;
}
