import { redirect } from "next/navigation";
import { getHubState } from "@/lib/actions/hub";
import { getSpotifyStatus } from "@/lib/actions/spotify";
import { HubClient } from "@/components/hub/hub-client";

// Alarms and settings are per-request state; never serve this from the cache.
export const dynamic = "force-dynamic";

export default async function HubPage() {
  const state = await getHubState();
  if (!state) redirect("/login?next=/hub");

  const { connected } = await getSpotifyStatus();

  return <HubClient initial={state} spotifyConnected={connected} />;
}
