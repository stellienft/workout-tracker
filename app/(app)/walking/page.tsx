import { requireUser } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { WalkingClient } from "@/components/walking/walking-client";

export const metadata = { title: "Walking" };

export default async function WalkingPage() {
  await requireUser();
  return (
    <PageShell>
      <PageHeader title="Walking" subtitle="Log your walks and walking-pad sessions." />
      <WalkingClient />
    </PageShell>
  );
}
