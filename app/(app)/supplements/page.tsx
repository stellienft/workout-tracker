import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { planAllows } from "@/lib/plan";
import { UpgradeWall } from "@/components/billing/upgrade-wall";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { SupplementAdvisor } from "@/components/coach/supplement-advisor";

export const metadata = { title: "Supplement Advisor" };

export default async function SupplementsPage() {
  await requireUser();
  const { plan } = await getUserPlan();
  if (!planAllows(plan, "ai_coach")) return <UpgradeWall feature="ai_coach" />;

  return (
    <PageShell>
      <PageHeader
        title="AI Supplement Advisor"
        subtitle="Educational supplement recommendations based on your training profile."
      />
      <div className="mt-6">
        <SupplementAdvisor />
      </div>
    </PageShell>
  );
}
