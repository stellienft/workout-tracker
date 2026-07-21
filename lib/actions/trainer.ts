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
async function getOrCreateTenant(supabase: ReturnType<typeof createClient> extends Promise<infer T> ? T : any, userId: string) {
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
  revalidatePath("/trainer");
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

  // Check if user exists by email
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", d.email.toLowerCase())
    .maybeSingle();

  if (!profile) {
    return {
      ok: false,
      error: "User not found. Ask them to sign up first, then add them.",
    };
  }

  const { error } = await supabase.from("trainer_clients").upsert({
    tenant_id: tenant.id,
    user_id: profile.id,
    display_name: d.displayName || null,
    status: "active",
  }, { onConflict: "tenant_id,user_id" });

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
