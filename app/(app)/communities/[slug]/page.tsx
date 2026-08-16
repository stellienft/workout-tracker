import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { getCommunityBySlug } from "@/lib/actions/communities";
import { getFeed } from "@/lib/actions/social";
import { PageShell } from "@/components/ui/page-header";
import { CommunityDetailClient } from "@/components/communities/community-detail-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const community = await getCommunityBySlug(slug);
  return { title: community?.name ?? "Community" };
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { user } = await requireUser();
  const community = await getCommunityBySlug(slug);
  if (!community) notFound();

  const [{ isPro }, posts] = await Promise.all([
    getUserPlan(),
    getFeed(1, 20, "discover", community.id),
  ]);

  return (
    <PageShell>
      <CommunityDetailClient
        community={community}
        initialPosts={posts}
        isPro={isPro}
        currentUserId={user.id}
      />
    </PageShell>
  );
}
