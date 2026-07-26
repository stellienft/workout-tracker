import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";

export const metadata = { title: "Profile" };

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const { user } = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, experience_level, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) notFound();

  return (
    <PageShell>
      <PageHeader title={profile.full_name ?? "Athlete"} />
      <p className="mt-6 text-sm text-[var(--text-secondary)]">Profile page coming soon.</p>
    </PageShell>
  );
}
