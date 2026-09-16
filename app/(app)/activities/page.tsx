import { requireUser, getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader, PageShell } from "@/components/ui/page-header";
import { getStravaStatus } from "@/lib/actions/strava";
import {
  ActivitiesClient,
  type ActivityRow,
} from "@/components/activities/activities-client";

export const metadata = { title: "Activities" };

export default async function ActivitiesPage() {
  const { user } = await requireUser();
  const { profile } = await getAuthContext();
  const supabase = await createClient();

  const [status, { data: rows }] = await Promise.all([
    getStravaStatus(),
    supabase
      .from("external_activities")
      .select(
        "id, activity_type, name, distance_m, moving_time_s, elevation_m, average_hr, average_speed, steps, start_at"
      )
      .eq("user_id", user.id)
      .order("start_at", { ascending: false })
      .limit(200),
  ]);

  const metric = (profile?.unit_preference ?? "metric") !== "imperial";

  return (
    <PageShell>
      <PageHeader
        title="Activities"
        subtitle="Your runs, rides and cardio — synced from Strava."
      />
      <ActivitiesClient
        activities={(rows ?? []) as ActivityRow[]}
        connected={status.connected}
        configured={status.configured}
        metric={metric}
      />
    </PageShell>
  );
}
