import { requireUser } from "@/lib/auth";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { listCommunities } from "@/lib/actions/communities";
import { CommunitiesClient } from "@/components/communities/communities-client";

export const metadata = { title: "Communities" };

export default async function CommunitiesPage() {
  await requireUser();
  const communities = await listCommunities();

  return (
    <PageShell>
      <PageHeader
        title="Communities"
        subtitle="Find your people — create or join a group and share the journey."
      />
      <div className="mt-6">
        <CommunitiesClient initial={communities} />
      </div>
    </PageShell>
  );
}
