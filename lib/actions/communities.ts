"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export interface CommunitySummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImagePath: string | null;
  memberCount: number;
  isMember: boolean;
  isOwner: boolean;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "community"}-${suffix}`;
}

/** Create a community and add the creator as its owner-member. */
export async function createCommunity(input: {
  name: string;
  description?: string;
}): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false, error: "Not authenticated" };

  const parsed = z
    .object({
      name: z.string().trim().min(2).max(80),
      description: z.string().trim().max(1000).optional().default(""),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a name (2–80 characters)." };

  const slug = slugify(parsed.data.name);
  const { data: community, error } = await supabase
    .from("communities")
    .insert({
      slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      created_by: user.id,
    })
    .select("id, slug")
    .single();
  if (error || !community) return { ok: false, error: error?.message ?? "Could not create" };

  await supabase.from("community_members").insert({
    community_id: community.id,
    user_id: user.id,
    role: "owner",
  });

  revalidatePath("/communities");
  return { ok: true, slug: community.slug };
}

export async function joinCommunity(communityId: string) {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z.string().uuid().safeParse(communityId);
  if (!parsed.success) return { ok: false as const, error: "Invalid community" };

  const { error } = await supabase
    .from("community_members")
    .upsert(
      { community_id: parsed.data, user_id: user.id, role: "member" },
      { onConflict: "community_id,user_id" }
    );
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/communities", "layout");
  return { ok: true as const };
}

export async function leaveCommunity(communityId: string) {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z.string().uuid().safeParse(communityId);
  if (!parsed.success) return { ok: false as const, error: "Invalid community" };

  // Owners can't leave — they'd orphan the group. They can delete it instead.
  const { data: community } = await supabase
    .from("communities")
    .select("created_by")
    .eq("id", parsed.data)
    .maybeSingle();
  if (community?.created_by === user.id)
    return { ok: false as const, error: "As the owner, delete the community instead of leaving." };

  const { error } = await supabase
    .from("community_members")
    .delete()
    .eq("community_id", parsed.data)
    .eq("user_id", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/communities", "layout");
  return { ok: true as const };
}

/** Delete a community (owner only). Posts and memberships cascade. */
export async function deleteCommunity(communityId: string) {
  const { supabase, user } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = z.string().uuid().safeParse(communityId);
  if (!parsed.success) return { ok: false as const, error: "Invalid community" };

  const { error } = await supabase
    .from("communities")
    .delete()
    .eq("id", parsed.data)
    .eq("created_by", user.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/communities");
  return { ok: true as const };
}

/** All communities with member counts + the current user's membership. */
export async function listCommunities(): Promise<CommunitySummary[]> {
  const { supabase, user } = await getAuthContext();
  if (!user) return [];

  const [{ data: communities }, { data: members }] = await Promise.all([
    supabase
      .from("communities")
      .select("id, slug, name, description, cover_image_path, created_by")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("community_members").select("community_id, user_id"),
  ]);

  const counts = new Map<string, number>();
  const mine = new Set<string>();
  for (const m of members ?? []) {
    const cid = m.community_id as string;
    counts.set(cid, (counts.get(cid) ?? 0) + 1);
    if ((m.user_id as string) === user.id) mine.add(cid);
  }

  return (communities ?? []).map((c) => ({
    id: c.id as string,
    slug: c.slug as string,
    name: c.name as string,
    description: (c.description as string | null) ?? null,
    coverImagePath: (c.cover_image_path as string | null) ?? null,
    memberCount: counts.get(c.id as string) ?? 0,
    isMember: mine.has(c.id as string),
    isOwner: (c.created_by as string) === user.id,
  }));
}

/** A single community by slug, with membership + member count. */
export async function getCommunityBySlug(
  slug: string
): Promise<CommunitySummary | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: c } = await supabase
    .from("communities")
    .select("id, slug, name, description, cover_image_path, created_by")
    .eq("slug", slug)
    .maybeSingle();
  if (!c) return null;

  const [{ count }, { data: mine }] = await Promise.all([
    supabase
      .from("community_members")
      .select("user_id", { count: "exact", head: true })
      .eq("community_id", c.id),
    supabase
      .from("community_members")
      .select("user_id")
      .eq("community_id", c.id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    id: c.id as string,
    slug: c.slug as string,
    name: c.name as string,
    description: (c.description as string | null) ?? null,
    coverImagePath: (c.cover_image_path as string | null) ?? null,
    memberCount: count ?? 0,
    isMember: !!mine,
    isOwner: (c.created_by as string) === user.id,
  };
}
