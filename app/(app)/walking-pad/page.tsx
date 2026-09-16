import { requireUser } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { WalkingPadClient } from "@/components/walking-pad/walking-pad-client";

export const metadata = { title: "Walking Pad" };

export default async function WalkingPadPage() {
  await requireUser();
  return (
    <PageShell>
      <PageHeader
        title="Walking Pad"
        subtitle="Connect your walking pad over Bluetooth and track your steps live."
      />
      <WalkingPadClient />
    </PageShell>
  );
}
