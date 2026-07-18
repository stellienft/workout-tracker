"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Every admin mutation passes through this guard, which re-checks the
 * caller's role against the database (via the is_admin RPC / user_roles).
 * RLS enforces the same rule at the row level, so this is defence in depth.
 */
async function requireAdminAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, isAdmin: false, isSuperAdmin: false };

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("roles(key)")
    .eq("user_id", user.id);
  const roles = (roleRows ?? [])
    .map((r) => (r.roles as unknown as { key: string } | null)?.key)
    .filter(Boolean) as string[];

  return {
    supabase,
    user,
    isAdmin: roles.includes("admin") || roles.includes("super_admin"),
    isSuperAdmin: roles.includes("super_admin"),
  };
}

// ---------- Programs ----------

export async function updateProgramStatus(programId: string, status: string) {
  const { supabase, user, isAdmin } = await requireAdminAction();
  if (!isAdmin) return { ok: false, error: "Forbidden" };
  const parsed = z
    .object({
      programId: z.string().uuid(),
      status: z.enum(["draft", "review", "published", "archived"]),
    })
    .safeParse({ programId, status });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const update: Record<string, unknown> = {
    status: parsed.data.status,
    updated_by: user!.id,
  };
  if (parsed.data.status === "published") update.published_at = new Date().toISOString();

  const { error } = await supabase
    .from("programs")
    .update(update)
    .eq("id", parsed.data.programId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/programs");
  revalidatePath("/programs");
  return { ok: true };
}

export async function updateProgramFields(
  programId: string,
  fields: Record<string, unknown>
) {
  const { supabase, user, isAdmin } = await requireAdminAction();
  if (!isAdmin) return { ok: false, error: "Forbidden" };

  const schema = z.object({
    name: z.string().min(1).max(120).optional(),
    short_description: z.string().max(300).optional(),
    description: z.string().max(4000).optional(),
    experience_level: z.enum(["beginner", "intermediate", "advanced", "all"]).optional(),
    scheduling_mode: z.enum(["sequential", "weekly_split", "calendar"]).optional(),
    duration_weeks: z.coerce.number().int().min(1).max(104).optional(),
    minimum_days_per_week: z.coerce.number().int().min(1).max(7).optional(),
    maximum_days_per_week: z.coerce.number().int().min(1).max(7).optional(),
    estimated_session_minutes: z.coerce.number().int().min(10).max(240).optional(),
    difficulty: z.string().max(40).optional(),
    featured: z.boolean().optional(),
    safety_notes: z.string().max(2000).optional(),
  });
  const parsed = schema.safeParse(fields);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { error } = await supabase
    .from("programs")
    .update({ ...parsed.data, updated_by: user!.id })
    .eq("id", programId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/programs/${programId}`);
  revalidatePath("/programs");
  return { ok: true };
}

export async function createProgram(input: { name: string; slug: string }) {
  const { supabase, user, isAdmin } = await requireAdminAction();
  if (!isAdmin) return { ok: false, error: "Forbidden" };
  const parsed = z
    .object({
      name: z.string().min(1).max(120),
      slug: z
        .string()
        .min(1)
        .max(120)
        .regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers and hyphens"),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { data, error } = await supabase
    .from("programs")
    .insert({
      name: parsed.data.name,
      slug: parsed.data.slug,
      status: "draft",
      created_by: user!.id,
      updated_by: user!.id,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/programs");
  return { ok: true, id: data.id };
}

// ---------- Goals ----------

export async function updateGoal(goalId: string, fields: Record<string, unknown>) {
  const { supabase, isAdmin } = await requireAdminAction();
  if (!isAdmin) return { ok: false, error: "Forbidden" };
  const schema = z.object({
    name: z.string().min(1).max(120).optional(),
    short_description: z.string().max(300).optional(),
    long_description: z.string().max(2000).optional(),
    display_order: z.coerce.number().int().optional(),
    active: z.boolean().optional(),
    cover_image_path: z.string().max(400).optional(),
  });
  const parsed = schema.safeParse(fields);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { error } = await supabase.from("fitness_goals").update(parsed.data).eq("id", goalId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/goals");
  revalidatePath("/goals");
  return { ok: true };
}

// ---------- Exercises ----------

export async function updateExercise(
  exerciseId: string,
  fields: Record<string, unknown>
) {
  const { supabase, isAdmin } = await requireAdminAction();
  if (!isAdmin) return { ok: false, error: "Forbidden" };
  const schema = z.object({
    name: z.string().min(1).max(120).optional(),
    instructions: z.string().max(2000).optional(),
    shoulder_safe: z.boolean().optional(),
    shoulder_notes: z.string().max(1000).optional(),
    status: z.enum(["draft", "review", "published", "archived"]).optional(),
    cover_image_path: z.string().max(400).optional(),
  });
  const parsed = schema.safeParse(fields);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { error } = await supabase.from("exercises").update(parsed.data).eq("id", exerciseId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/exercises");
  revalidatePath(`/admin/exercises/${exerciseId}`);
  return { ok: true };
}

// ---------- Videos ----------

export async function upsertExerciseVideo(input: {
  id?: string;
  exerciseId: string;
  sourceUrl: string;
  title?: string;
  creatorName?: string;
}) {
  const { supabase, isAdmin } = await requireAdminAction();
  if (!isAdmin) return { ok: false, error: "Forbidden" };

  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      exerciseId: z.string().uuid(),
      sourceUrl: z.string().url(),
      title: z.string().max(200).optional(),
      creatorName: z.string().max(120).optional(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Provide a valid YouTube URL" };

  const { youtubeVideoId, youtubeEmbedUrl, youtubeThumbnailUrl } = await import(
    "@/lib/utils"
  );
  const vid = youtubeVideoId(parsed.data.sourceUrl);

  const row = {
    exercise_id: parsed.data.exerciseId,
    provider: "youtube",
    source_url: parsed.data.sourceUrl,
    provider_video_id: vid,
    embed_url: vid ? youtubeEmbedUrl(vid) : null,
    thumbnail_url: vid ? youtubeThumbnailUrl(vid) : null,
    title: parsed.data.title ?? null,
    creator_name: parsed.data.creatorName ?? null,
    verification_status: "unverified" as const,
    active: true,
  };

  if (parsed.data.id) {
    const { error } = await supabase
      .from("exercise_videos")
      .update(row)
      .eq("id", parsed.data.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("exercise_videos").insert(row);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/admin/videos");
  return { ok: true };
}

export async function setVideoVerification(
  videoId: string,
  status: "verified" | "broken" | "unverified"
) {
  const { supabase, isAdmin } = await requireAdminAction();
  if (!isAdmin) return { ok: false, error: "Forbidden" };
  const { error } = await supabase
    .from("exercise_videos")
    .update({
      verification_status: status,
      last_verified_at: status === "verified" ? new Date().toISOString() : null,
    })
    .eq("id", videoId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/videos");
  return { ok: true };
}

// ---------- Featured content ----------

export async function toggleFeatured(id: string, active: boolean) {
  const { supabase, isAdmin } = await requireAdminAction();
  if (!isAdmin) return { ok: false, error: "Forbidden" };
  const { error } = await supabase
    .from("featured_content")
    .update({ active })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/featured-content");
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------- Media ----------

export async function updateMediaStatus(id: string, status: string) {
  const { supabase, isAdmin } = await requireAdminAction();
  if (!isAdmin) return { ok: false, error: "Forbidden" };
  const parsed = z
    .enum(["draft", "published", "archived"])
    .safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status" };
  const { error } = await supabase
    .from("media_assets")
    .update({ status: parsed.data })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/media");
  return { ok: true };
}

// ---------- Roles (super admin only) ----------

export async function setUserRole(targetUserId: string, roleKey: string) {
  const { supabase, isSuperAdmin } = await requireAdminAction();
  if (!isSuperAdmin) return { ok: false, error: "Only a super admin can change roles" };
  const parsed = z
    .object({
      targetUserId: z.string().uuid(),
      roleKey: z.enum(["user", "admin", "super_admin"]),
    })
    .safeParse({ targetUserId, roleKey });
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("key", parsed.data.roleKey)
    .maybeSingle();
  if (!role) return { ok: false, error: "Role not found" };

  const { error } = await supabase
    .from("user_roles")
    .upsert(
      { user_id: parsed.data.targetUserId, role_id: role.id },
      { onConflict: "user_id,role_id" }
    );
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function removeUserRole(targetUserId: string, roleKey: string) {
  const { supabase, isSuperAdmin } = await requireAdminAction();
  if (!isSuperAdmin) return { ok: false, error: "Only a super admin can change roles" };
  if (roleKey === "user") return { ok: false, error: "Cannot remove the base user role" };

  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("key", roleKey)
    .maybeSingle();
  if (!role) return { ok: false, error: "Role not found" };

  const { error } = await supabase
    .from("user_roles")
    .delete()
    .eq("user_id", targetUserId)
    .eq("role_id", role.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}
