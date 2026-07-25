"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { getUserPlan } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Send a friend request by email. */
export async function sendFriendRequest(email: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z.string().email().safeParse(email.trim().toLowerCase());
  if (!parsed.success) return { ok: false as const, error: "Enter a valid email." };

  const { data: foundId } = await supabase.rpc("friend_user_id_by_email", {
    p_email: parsed.data,
  });
  if (!foundId) {
    return { ok: false as const, error: "No Stellio Fit user with that email." };
  }
  if (foundId === user.id) {
    return { ok: false as const, error: "That's you!" };
  }

  // Existing relationship in either direction?
  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status, requester_id")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${foundId}),and(requester_id.eq.${foundId},addressee_id.eq.${user.id})`
    )
    .maybeSingle();
  if (existing) {
    if (existing.status === "accepted")
      return { ok: false as const, error: "You're already friends." };
    // A pending request from them → accept it instead of duplicating.
    if (existing.requester_id === foundId) {
      await supabase.from("friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", existing.id);
      revalidatePath("/friends");
      return { ok: true as const, accepted: true };
    }
    return { ok: false as const, error: "Request already sent." };
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: foundId,
    status: "pending",
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/friends");
  return { ok: true as const };
}

/** Accept or decline an incoming request. */
export async function respondFriendRequest(friendshipId: string, accept: boolean) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { error } = await supabase
    .from("friendships")
    .update({ status: accept ? "accepted" : "declined", updated_at: new Date().toISOString() })
    .eq("id", friendshipId)
    .eq("addressee_id", user.id); // only the addressee can accept/decline
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/friends");
  return { ok: true as const };
}

/** Remove a friend or cancel a request (either party). */
export async function removeFriend(friendshipId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/friends");
  return { ok: true as const };
}

/** Share one of my splits with a friend (snapshotted so they need no read access). */
export async function shareSplitWithFriend(input: { splitId: string; toUserId: string }) {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false as const, error: "Sharing workouts is a Pro feature." };
  const parsed = z
    .object({ splitId: z.string().uuid(), toUserId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const { splitId, toUserId } = parsed.data;

  // Must be an accepted friend.
  const { data: friend } = await supabase
    .from("friendships")
    .select("id")
    .eq("status", "accepted")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${toUserId}),and(requester_id.eq.${toUserId},addressee_id.eq.${user.id})`
    )
    .maybeSingle();
  if (!friend) return { ok: false as const, error: "You can only share with friends." };

  // Read my split (owner reads own) and snapshot it.
  const { data: split } = await supabase
    .from("custom_splits")
    .select("name, custom_split_days(id, name, day_number, focus_muscles, custom_split_day_exercises(exercise_id, position, sets, rep_target, rest_seconds, notes))")
    .eq("id", splitId)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!split) return { ok: false as const, error: "Split not found" };

  type DayRow = {
    name: string;
    day_number: number;
    focus_muscles: string[];
    custom_split_day_exercises: {
      exercise_id: string;
      position: number;
      sets: number;
      rep_target: string | null;
      rest_seconds: number;
      notes: string | null;
    }[];
  };
  const days = ((split.custom_split_days as DayRow[]) ?? [])
    .sort((a, b) => a.day_number - b.day_number)
    .map((d) => ({
      name: d.name,
      focusMuscles: d.focus_muscles ?? [],
      exercises: (d.custom_split_day_exercises ?? [])
        .sort((a, b) => a.position - b.position)
        .map((e) => ({
          exerciseId: e.exercise_id,
          sets: e.sets,
          repTarget: e.rep_target,
          restSeconds: e.rest_seconds,
          notes: e.notes,
        })),
    }));

  const { error } = await supabase.from("workout_shares").insert({
    from_user_id: user.id,
    from_name: profile?.full_name ?? null,
    to_user_id: toUserId,
    name: split.name as string,
    payload: { days },
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/friends");
  return { ok: true as const };
}

/** Import a workout a friend shared into my own splits. */
export async function importSharedWorkout(shareId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { isPro } = await getUserPlan();
  if (!isPro) return { ok: false as const, error: "Importing shared workouts is a Pro feature." };

  const { data: share } = await supabase
    .from("workout_shares")
    .select("id, name, payload, from_name")
    .eq("id", shareId)
    .eq("to_user_id", user.id)
    .maybeSingle();
  if (!share) return { ok: false as const, error: "Share not found" };

  const payload = share.payload as {
    days: {
      name: string;
      focusMuscles: string[];
      exercises: { exerciseId: string; sets: number; repTarget: string | null; restSeconds: number; notes: string | null }[];
    }[];
  };

  const { data: newSplit, error: splitErr } = await supabase
    .from("custom_splits")
    .insert({
      owner_user_id: user.id,
      name: share.name as string,
      description: share.from_name ? `Shared by ${share.from_name}` : "Shared with you",
    })
    .select("id")
    .single();
  if (splitErr || !newSplit) {
    return { ok: false as const, error: splitErr?.message ?? "Could not import" };
  }

  let dayNumber = 0;
  for (const day of payload.days ?? []) {
    dayNumber += 1;
    const { data: dayRow } = await supabase
      .from("custom_split_days")
      .insert({
        split_id: newSplit.id,
        day_number: dayNumber,
        name: day.name,
        focus_muscles: day.focusMuscles ?? [],
      })
      .select("id")
      .single();
    if (!dayRow) continue;
    const rows = (day.exercises ?? []).map((e, i) => ({
      split_day_id: dayRow.id,
      exercise_id: e.exerciseId,
      position: i + 1,
      sets: e.sets,
      rep_target: e.repTarget,
      rest_seconds: e.restSeconds,
      notes: e.notes,
    }));
    if (rows.length) await supabase.from("custom_split_day_exercises").insert(rows);
  }

  await supabase
    .from("workout_shares")
    .update({ imported_at: new Date().toISOString() })
    .eq("id", shareId);

  revalidatePath("/friends");
  revalidatePath("/splits");
  return { ok: true as const, splitId: newSplit.id };
}
