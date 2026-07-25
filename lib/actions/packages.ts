"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function myTenantId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("tenants")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();
  return (data?.id as string | null) ?? null;
}

const packageSchema = z.object({
  name: z.string().min(2, "Name your package").max(80),
  description: z.string().max(600).optional(),
  priceCents: z.coerce.number().int().min(0).max(10_000_00),
  interval: z.enum(["monthly", "weekly", "one_off"]).default("monthly"),
  features: z.array(z.string().max(120)).max(20).default([]),
});

export async function createTrainerPackage(input: z.input<typeof packageSchema>) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = packageSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const tenantId = await myTenantId(supabase, user.id);
  if (!tenantId) return { ok: false as const, error: "Finish trainer setup first." };

  const d = parsed.data;
  const { error } = await supabase.from("trainer_packages").insert({
    tenant_id: tenantId,
    name: d.name,
    description: d.description ?? null,
    price_cents: d.priceCents,
    interval: d.interval,
    features: d.features.filter((f) => f.trim().length > 0),
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/trainer/packages");
  return { ok: true as const };
}

export async function updateTrainerPackage(
  input: z.input<typeof packageSchema> & { id: string }
) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const parsed = packageSchema.extend({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success)
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid" };
  const d = parsed.data;

  const { error } = await supabase
    .from("trainer_packages")
    .update({
      name: d.name,
      description: d.description ?? null,
      price_cents: d.priceCents,
      interval: d.interval,
      features: d.features.filter((f) => f.trim().length > 0),
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/trainer/packages");
  return { ok: true as const };
}

export async function setPackageArchived(id: string, archived: boolean) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };
  const { error } = await supabase
    .from("trainer_packages")
    .update({ status: archived ? "archived" : "active", updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/trainer/packages");
  return { ok: true as const };
}

/** Assign (or move) a client onto a package. Pass packageId null to remove. */
export async function assignClientPackage(input: {
  clientUserId: string;
  packageId: string | null;
  status?: "active" | "paused" | "cancelled";
}) {
  const { supabase, user } = await auth();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  const parsed = z
    .object({
      clientUserId: z.string().uuid(),
      packageId: z.string().uuid().nullable(),
      status: z.enum(["active", "paused", "cancelled"]).default("active"),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Invalid input" };

  const tenantId = await myTenantId(supabase, user.id);
  if (!tenantId) return { ok: false as const, error: "Finish trainer setup first." };
  const d = parsed.data;

  if (!d.packageId) {
    const { error } = await supabase
      .from("trainer_client_packages")
      .delete()
      .eq("tenant_id", tenantId)
      .eq("client_user_id", d.clientUserId);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase.from("trainer_client_packages").upsert(
      {
        tenant_id: tenantId,
        client_user_id: d.clientUserId,
        package_id: d.packageId,
        status: d.status,
        assigned_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,client_user_id" }
    );
    if (error) return { ok: false as const, error: error.message };
  }

  revalidatePath("/trainer/clients");
  revalidatePath("/my-coach");
  return { ok: true as const };
}
