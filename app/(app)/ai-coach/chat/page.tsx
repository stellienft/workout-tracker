import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { planAllows } from "@/lib/plan";
import { UpgradeWall } from "@/components/billing/upgrade-wall";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { AskCoach } from "@/components/coach/ask-coach";

export const metadata = { title: "Ask the AI Coach" };

export default async function AskCoachPage() {
  await requireUser();
  const { plan } = await getUserPlan();
  if (!planAllows(plan, "ai_coach")) return <UpgradeWall feature="ai_coach" />;

  return (
    <PageShell>
      <PageHeader
        title="Ask the AI Coach"
        subtitle="Gym & fitness questions only — get instant answers from your AI coach."
      />
      <div className="mt-6">
        <AskCoach />
      </div>
    </PageShell>
  );
}
