import { requireUser } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { FriendsClient } from "@/components/friends/friends-client";

export const metadata = { title: "Friends" };

export default async function FriendsPage() {
  const { user } = await requireUser();
  const { isPro } = await getUserPlan();
  const supabase = await createClient();

  // Friends are free; the leaderboard, sharing and importing are Pro.
  const [{ data: friends }, { data: board }, { data: shares }, { data: splits }] =
    await Promise.all([
      supabase.rpc("friend_list"),
      isPro ? supabase.rpc("friend_leaderboard") : Promise.resolve({ data: [] }),
      isPro
        ? supabase
            .from("workout_shares")
            .select("id, name, from_name, created_at")
            .eq("to_user_id", user.id)
            .is("imported_at", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      isPro
        ? supabase
            .from("custom_splits")
            .select("id, name")
            .eq("owner_user_id", user.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

  return (
    <PageShell>
      <PageHeader
        title="Friends"
        subtitle="Add friends free — compete and share workouts with Pro."
      />
      <div className="mt-6">
        <FriendsClient
          myId={user.id}
          isPro={isPro}
          friends={(friends ?? []) as never[]}
          board={(board ?? []) as never[]}
          shares={(shares ?? []) as never[]}
          mySplits={(splits ?? []).map((s) => ({ id: s.id as string, name: s.name as string }))}
        />
      </div>
    </PageShell>
  );
}
