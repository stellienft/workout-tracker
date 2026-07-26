import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { FeedClient } from "@/components/feed/feed-client";
import { getFeed } from "@/lib/actions/social";

export const metadata = { title: "Feed" };

export default async function FeedPage() {
  const { user } = await requireUser();
  const { isPro } = await getUserPlan();

  const posts = await getFeed(1, 20);

  return (
    <PageShell>
      <PageHeader
        title="Feed"
        subtitle="Share your wins and cheer on the community."
      />
      <div className="mt-6">
        <FeedClient
          initialPosts={posts}
          isPro={isPro}
          currentUserId={user.id}
        />
      </div>
    </PageShell>
  );
}
