"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { disconnect, isConnected, spotifyConfigured } from "@/lib/spotify";

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getSpotifyStatus(): Promise<{ configured: boolean; connected: boolean }> {
  const configured = spotifyConfigured();
  const uid = await currentUserId();
  const connected = configured && uid ? await isConnected(uid) : false;
  return { configured, connected };
}

export async function disconnectSpotify() {
  const uid = await currentUserId();
  if (!uid) return { ok: false as const, error: "Not authenticated" };
  await disconnect(uid);
  revalidatePath("/settings");
  return { ok: true as const };
}
