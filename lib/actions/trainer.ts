"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** Get the trainer's tenant (auto-create if missing). */
async function getOrCreateTenant(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (tenant) return tenant;

  // Auto-create a tenant from the trainer's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();

  const name = profile?.full_name || "My Training Business";
  const slugBase = (profile?.full_name || "trainer")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const slug = `${slugBase}-${randomUUID().slice(0, 8)}`;

  const { data: newTenant, error } = await supabase
    .from("tenants")
    .insert({
      owner_user_id: userId,
      name,
      slug,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return newTenant;
}

// ============================================================
// Tenant / branding
// ============================================================

const tenantSchema = z.object({
  name: z.string().min(2).max(100),
  tagline: z.string().max(200).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  customDomain: z.string().max(200).optional().or(z.literal("")),
});

export async function updateTenant(input: z.input<typeof tenantSchema>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = tenantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const update: Record<string, unknown> = { name: d.name };
  if (d.tagline !== undefined) update.tagline = d.tagline;
  if (d.logoUrl) update.logo_url = d.logoUrl;
  if (d.accentColor) update.accent_color = d.accentColor;
  if (d.customDomain !== undefined) update.custom_domain = d.customDomain;

  const { error } = await supabase
    .from("tenants")
    .update(update)
    .eq("owner_user_id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/trainer");
  return { ok: true };
}

/**
 * Finish the trainer's initial setup: save their business branding and mark
 * onboarding complete so they land in the portal (not the member flow).
 */
export async function completeTrainerSetup(input: {
  name: string;
  tagline?: string;
  accentColor?: string;
  logoUrl?: string;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = z
    .object({
      name: z.string().min(2, "Add a business name").max(120),
      tagline: z.string().max(200).optional(),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      logoUrl: z.string().url().optional().or(z.literal("")),
    })
    .safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const tenant = await getOrCreateTenant(supabase, user.id);

  const update: Record<string, unknown> = { name: d.name };
  if (d.tagline !== undefined) update.tagline = d.tagline || null;
  if (d.accentColor) update.accent_color = d.accentColor;
  if (d.logoUrl) update.logo_url = d.logoUrl;

  const { error: tErr } = await supabase
    .from("tenants")
    .update(update)
    .eq("id", tenant.id);
  if (tErr) return { ok: false, error: tErr.message };

  const { error: pErr } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);
  if (pErr) return { ok: false, error: pErr.message };

  revalidatePath("/trainer");
  revalidatePath("/", "layout");
  return { ok: true };
}

// ============================================================
// Trainer programs
// ============================================================

const programSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  coverImagePath: z.string().optional().or(z.literal("")),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "all"]),
  durationWeeks: z.coerce.number().int().min(1).max(52).default(4),
  category: z.string().max(50).default("strength"),
});

export async function createTrainerProgram(input: z.input<typeof programSchema>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = programSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const tenant = await getOrCreateTenant(supabase, user.id);
  const slug = d.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + randomUUID().slice(0, 6);

  const { data, error } = await supabase
    .from("trainer_programs")
    .insert({
      tenant_id: tenant.id,
      name: d.name,
      slug,
      description: d.description,
      cover_image_path: d.coverImagePath || null,
      difficulty: d.difficulty,
      duration_weeks: d.durationWeeks,
      category: d.category,
    })
    .select("id, slug")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/trainer");
  return { ok: true, id: data.id, slug: data.slug };
}

export async function addExerciseToTrainerProgram(input: {
  trainerProgramId: string;
  exerciseId: string;
  dayLabel?: string;
  position?: number;
  sets?: number;
  reps?: string;
  restSeconds?: number;
  notes?: string;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("trainer_program_exercises").insert({
    trainer_program_id: input.trainerProgramId,
    exercise_id: input.exerciseId,
    day_label: input.dayLabel || null,
    position: input.position || 0,
    sets: input.sets || null,
    reps: input.reps || null,
    rest_seconds: input.restSeconds || null,
    notes: input.notes || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trainer/programs/${input.trainerProgramId}`);
  revalidatePath("/trainer");
  return { ok: true };
}

export async function removeTrainerProgramExercise(input: {
  rowId: string;
  trainerProgramId: string;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("trainer_program_exercises")
    .delete()
    .eq("id", input.rowId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/trainer/programs/${input.trainerProgramId}`);
  return { ok: true };
}

export async function publishTrainerProgram(programId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("trainer_programs")
    .update({ published: true })
    .eq("id", programId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/trainer");
  return { ok: true };
}

// ============================================================
// Trainer videos
// ============================================================

const videoSchema = z.object({
  title: z.string().min(2).max(200),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(1000).optional(),
});

export async function addTrainerVideo(input: z.input<typeof videoSchema>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = videoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const tenant = await getOrCreateTenant(supabase, user.id);

  let providerVideoId = "";
  let embedUrl = "";
  let thumbnailUrl = "";
  if (d.sourceUrl && d.sourceUrl.includes("youtube.com")) {
    const match = d.sourceUrl.match(/[?&]v=([\w-]{11})/);
    if (match) {
      providerVideoId = match[1];
      embedUrl = `https://www.youtube-nocookie.com/embed/${providerVideoId}`;
      thumbnailUrl = `https://img.youtube.com/vi/${providerVideoId}/hqdefault.jpg`;
    }
  }

  const { error } = await supabase.from("trainer_videos").insert({
    tenant_id: tenant.id,
    title: d.title,
    source_url: d.sourceUrl || null,
    provider: "youtube",
    provider_video_id: providerVideoId || null,
    embed_url: embedUrl || null,
    thumbnail_url: thumbnailUrl || null,
    notes: d.notes || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/trainer");
  return { ok: true };
}

const VIDEO_BUCKET = "trainer-videos";

/**
 * Record a video the trainer already uploaded straight to storage from the
 * browser. The file itself never passes through this server action — large
 * videos exceed the Server Action / serverless request-body limits, which was
 * crashing the upload — so the client uploads to the per-tenant folder (guarded
 * by storage RLS) and we just persist the row here.
 */
export async function recordTrainerVideoUpload(input: {
  title: string;
  notes?: string;
  storagePath: string;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = z
    .object({
      title: z.string().min(2).max(200),
      notes: z.string().max(1000).optional(),
      storagePath: z.string().min(3).max(300),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const tenant = await getOrCreateTenant(supabase, user.id);

  // The upload RLS already scopes writes to the tenant folder; double-check the
  // recorded path belongs to this trainer so a row can't point elsewhere.
  if (!d.storagePath.startsWith(`${tenant.id}/`)) {
    return { ok: false, error: "Invalid upload path." };
  }

  const { data: pub } = supabase.storage
    .from(VIDEO_BUCKET)
    .getPublicUrl(d.storagePath);

  const { error } = await supabase.from("trainer_videos").insert({
    tenant_id: tenant.id,
    title: d.title,
    source_url: pub.publicUrl,
    storage_path: d.storagePath,
    provider: "upload",
    notes: d.notes || null,
  });
  if (error) {
    // Clean up the orphaned object so storage and table stay consistent.
    await supabase.storage.from(VIDEO_BUCKET).remove([d.storagePath]);
    return { ok: false, error: error.message };
  }

  revalidatePath("/trainer");
  return { ok: true };
}

// ============================================================
// Clients
// ============================================================

export async function inviteClient(input: { email: string; displayName?: string }) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = z.object({
    email: z.string().email(),
    displayName: z.string().max(100).optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid email" };
  const d = parsed.data;

  const tenant = await getOrCreateTenant(supabase, user.id);

  // Resolve the user by email via a definer function — a trainer can't read
  // other users' profile rows directly under RLS.
  const { data: foundId } = await supabase.rpc("find_user_id_by_email", {
    p_email: d.email,
  });

  if (!foundId) {
    return {
      ok: false,
      error: "No Stellio Fit account uses that email. Ask them to sign up first.",
    };
  }

  const { error } = await supabase.from("trainer_clients").upsert({
    tenant_id: tenant.id,
    user_id: foundId as string,
    display_name: d.displayName || null,
    status: "active",
  }, { onConflict: "tenant_id,user_id" });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/trainer/clients");
  return { ok: true };
}

/** Assign a program to a client — clones it into a trainable client-owned split. */
export async function assignProgramToClient(input: {
  programId: string;
  clientUserId: string;
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = z
    .object({ programId: z.string().uuid(), clientUserId: z.string().uuid() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  // A program with no exercises would assign an empty split.
  const { count } = await supabase
    .from("trainer_program_exercises")
    .select("id", { count: "exact", head: true })
    .eq("trainer_program_id", parsed.data.programId);
  if (!count) {
    return { ok: false, error: "Add exercises to this program before assigning it." };
  }

  const { error } = await supabase.rpc("assign_program_to_client", {
    p_program_id: parsed.data.programId,
    p_client_user_id: parsed.data.clientUserId,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/trainer/clients");
  return { ok: true };
}

/** Revoke an assignment and remove the client's materialised split. */
export async function unassignPlan(assignmentId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };
  const parsed = z.string().uuid().safeParse(assignmentId);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { error } = await supabase.rpc("unassign_plan", {
    p_assignment_id: parsed.data,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/trainer/clients");
  return { ok: true };
}

export async function updateClientStatus(clientId: string, status: "active" | "paused" | "removed") {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("trainer_clients")
    .update({ status })
    .eq("id", clientId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/trainer/clients");
  return { ok: true };
}

// ============================================================
// Chat
// ============================================================

const messageSchema = z.object({
  threadId: z.string().uuid(),
  body: z.string().min(1).max(5000),
});

export async function sendMessage(input: z.input<typeof messageSchema>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const d = parsed.data;

  const { error } = await supabase.from("chat_messages").insert({
    thread_id: d.threadId,
    sender_id: user.id,
    body: d.body,
  });

  if (error) return { ok: false, error: error.message };

  // Update thread timestamp
  await supabase
    .from("chat_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", d.threadId);

  revalidatePath("/trainer/chat");
  return { ok: true };
}

export async function startThread(clientId: string) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not authenticated" };

  const tenant = await getOrCreateTenant(supabase, user.id);

  const { data: existing } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("trainer_id", user.id)
    .eq("client_id", clientId)
    .maybeSingle();

  if (existing) return { ok: true, threadId: existing.id };

  const { data, error } = await supabase
    .from("chat_threads")
    .insert({
      tenant_id: tenant.id,
      trainer_id: user.id,
      client_id: clientId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  revalidatePath("/trainer/chat");
  return { ok: true, threadId: data.id };
}
