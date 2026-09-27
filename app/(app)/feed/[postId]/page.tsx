import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { getPost } from "@/lib/actions/social";
import { PageShell } from "@/components/ui/page-header";
import { PostCard } from "@/components/feed/post-card";

export const metadata = { title: "Post" };

export default async function PostPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const { user } = await requireUser();
  const { isPro } = await getUserPlan();
  const post = await getPost(postId);
  if (!post) notFound();

  return (
    <PageShell>
      <Link
        href="/feed"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" /> Back to feed
      </Link>
      <PostCard post={post} isPro={isPro} currentUserId={user.id} />
    </PageShell>
  );
}
