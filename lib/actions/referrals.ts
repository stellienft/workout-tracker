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

  // Names/emails of referred users live on owner-only profiles, so read them
  // (and the referral rows) with the service role — they're this member's own
  // referrals.
  const svc = serviceSupabase();
  const [{ data: refRows }, { data: grant }] = await Promise.all([
    svc
      .from("referrals")
      .select("referred_user_id, created_at")
      .eq("referrer_user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("free_grants").select("pro_until").eq("user_id", user.id).maybeSingle(),
  ]);

  const referredIds = (refRows ?? []).map((r) => r.referred_user_id as string);
  let referred: { name: string; joinedAt: string }[] = [];
  if (referredIds.length > 0) {
    const { data: profs } = await svc
      .from("profiles")
      .select("id, full_name, email")
      .in("id", referredIds);
    const byId = new Map(
      (profs ?? []).map((p) => [p.id as string, p as { full_name: string | null; email: string | null }])
    );
    referred = (refRows ?? []).map((r) => {
      const p = byId.get(r.referred_user_id as string);
      return {
        name: p?.full_name || p?.email || "New member",
        joinedAt: r.created_at as string,
      };
    });
  }

  return {
    ok: true as const,
    code,
    link: `${siteUrl()}/signup?ref=${code}`,
    joined: referred.length,
    referred,
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
  // Prefer the cookie, but fall back to the code stamped on the auth user at
  // signup — that survives email confirmation, a new tab, or a different device.
  const metaCode = (user.user_metadata as { ref_code?: string } | undefined)?.ref_code;
  const code = (jar.get(REF_COOKIE)?.value || metaCode)?.toUpperCase();
  if (!code) return { ok: true as const, referred: false };

  const svc = serviceSupabase();

  // Once we've handled this code, forget it everywhere so it isn't reconsidered.
  async function clear() {
    jar.delete(REF_COOKIE);
    if (metaCode) {
      await svc.auth.admin
        .updateUserById(user!.id, { user_metadata: { ...user!.user_metadata, ref_code: null } })
        .catch(() => {});
    }
  }

  // Already referred? Nothing to do.
  const { data: existing } = await svc
    .from("referrals")
    .select("id")
    .eq("referred_user_id", user.id)
    .maybeSingle();
  if (existing) {
    await clear();
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
    await clear();
    return { ok: true as const, referred: false };
  }

  const { error } = await svc.from("referrals").insert({
    referrer_user_id: referrerId,
    referred_user_id: user.id,
    code,
  });
  if (error) {
    await clear();
    return { ok: true as const, referred: false };
  }

  await extendFreeGrant(svc, user.id, "referred_signup");
  await extendFreeGrant(svc, referrerId, "referral_reward");

  await clear();
  return { ok: true as const, referred: true };
}
