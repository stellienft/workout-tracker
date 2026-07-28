"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";

const scheduleSchema = z.object({
  clientUserId: z.string().uuid(),
  scheduledAt: z.string().min(1), // ISO datetime
  durationMin: z.coerce.number().int().min(5).max(240).default(30),
  type: z.enum(["session", "check_in"]).default("session"),
  location: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
});

/** Trainer schedules a session / check-in with one of their active clients. */
export async function scheduleSession(input: z.input<typeof scheduleSchema>) {
  const { supabase, user, profile } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };
  const d = parsed.data;

  const when = new Date(d.scheduledAt);
  if (isNaN(when.getTime())) return { ok: false as const, error: "Invalid date/time" };

  // The caller must own a tenant this person is an active client of.
  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name")
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!tenant) return { ok: false as const, error: "No trainer tenant" };

  const { data: rel } = await supabase
    .from("trainer_clients")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("user_id", d.clientUserId)
    .eq("status", "active")
    .maybeSingle();
  if (!rel) return { ok: false as const, error: "Not an active client of yours." };

  const { error } = await supabase.from("coaching_sessions").insert({
    tenant_id: tenant.id,
    trainer_id: user.id,
    client_user_id: d.clientUserId,
    scheduled_at: when.toISOString(),
    duration_min: d.durationMin,
    type: d.type,
    location: d.location || null,
    notes: d.notes || null,
  });
  if (error) return { ok: false as const, error: error.message };

  const label = d.type === "check_in" ? "check-in" : "session";
  const coach = (profile?.full_name as string) || (tenant.name as string) || "Your coach";
  await notifyUser({
    userId: d.clientUserId,
    type: "coaching_session",
    title: `${coach} scheduled a ${label}`,
    body: `${when.toLocaleString()}${d.location ? ` · ${d.location}` : ""}`,
    link: "/my-coach",
  });

  revalidatePath(`/trainer/clients/${d.clientUserId}`);
  return { ok: true as const };
}

/** Trainer cancels a scheduled session. */
export async function cancelSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = z.string().uuid().safeParse(sessionId);
  if (!parsed.success) return { ok: false as const, error: "Invalid id" };

  // RLS limits the update to sessions in a tenant the caller owns.
  const { data: row, error } = await supabase
    .from("coaching_sessions")
    .update({ status: "cancelled" })
    .eq("id", parsed.data)
    .select("client_user_id")
    .maybeSingle();
  if (error) return { ok: false as const, error: error.message };

  if (row?.client_user_id) revalidatePath(`/trainer/clients/${row.client_user_id}`);
  return { ok: true as const };
}
