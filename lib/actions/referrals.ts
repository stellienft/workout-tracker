"use server";

import { cookies } from "next/headers";
import { getAuthContext } from "@/lib/auth";
import { serviceSupabase } from "@/lib/push";
import { siteUrl } from "@/lib/stripe";

const FREE_DAYS = 30;
const REF_COOKIE = "ref_code";

function newCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Ensure the member has a referral code; return their code, link and stats. */
export async function getMyReferral() {
  const { user, profile, supabase } = await getAuthContext();
  if (!user) return { ok: false as const, error: "Not authenticated" };

  let code =
    (profile as unknown as { referral_code?: string | null } | null)?.referral_code ??
    null;
  if (!code) {
    // Generate a unique code (retry on the rare collision).
    for (let i = 0; i < 5 && !code; i++) {
      const candidate = newCode();
      const { error } = await supabase
        .from("profiles")
        .update({ referral_code: candidate })
        .eq("id", user.id);
      if (!error) code = candidate;
    }
  }
  if (!code) return { ok: false as const, error: "Could not create a code" };

  const [{ count }, { data: grant }] = await Promise.all([
    supabase
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_user_id", user.id),
    supabase.from("free_grants").select("pro_until").eq("user_id", user.id).maybeSingle(),
  ]);

  return {
    ok: true as const,
    code,
    link: `${siteUrl()}/signup?ref=${code}`,
    joined: count ?? 0,
    proUntil: (grant?.pro_until as string | null) ?? null,
  };
}

async function extendFreeGrant(
  svc: ReturnType<typeof serviceSupabase>,
  userId: string,
  reason: string
) {
  const { data: existing } = await svc
    .from("free_grants")
    .select("pro_until")
    .eq("user_id", userId)
    .maybeSingle();
  const base = existing?.pro_until
    ? Math.max(Date.now(), new Date(existing.pro_until as string).getTime())
    : Date.now();
  const proUntil = new Date(base + FREE_DAYS * 86_400_000).toISOString();
  await svc
    .from("free_grants")
    .upsert({ user_id: userId, pro_until: proUntil, reason, updated_at: new Date().toISOString() });
}

/**
 * Redeem a referral cookie for the current (newly-onboarded) user. Grants both
 * the new member and the referrer a free month. Idempotent and abuse-guarded.
 */
export async function processReferral() {
  const { user } = await getAuthContext();
  if (!user) return { ok: false as const };

  const jar = await cookies();
  const code = jar.get(REF_COOKIE)?.value?.toUpperCase();
  if (!code) return { ok: true as const, referred: false };

  const svc = serviceSupabase();

  // Already referred? Nothing to do.
  const { data: existing } = await svc
    .from("referrals")
    .select("id")
    .eq("referred_user_id", user.id)
    .maybeSingle();
  if (existing) {
    jar.delete(REF_COOKIE);
    return { ok: true as const, referred: false };
  }

  // Find the referrer by code; can't refer yourself.
  const { data: referrer } = await svc
    .from("profiles")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();
  const referrerId = referrer?.id as string | undefined;
  if (!referrerId || referrerId === user.id) {
    jar.delete(REF_COOKIE);
    return { ok: true as const, referred: false };
  }

  const { error } = await svc.from("referrals").insert({
    referrer_user_id: referrerId,
    referred_user_id: user.id,
    code,
  });
  if (error) {
    jar.delete(REF_COOKIE);
    return { ok: true as const, referred: false };
  }

  await extendFreeGrant(svc, user.id, "referred_signup");
  await extendFreeGrant(svc, referrerId, "referral_reward");

  jar.delete(REF_COOKIE);
  return { ok: true as const, referred: true };
}
